setInterval(() => {
    const ahora = new Date();
    const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fechaStr = ahora.toLocaleDateString('es-VE', opcionesFecha);
    const horaStr = ahora.toLocaleTimeString('es-VE');
    const elemento = document.getElementById('live-datetime');
    if (elemento) {
        // Formato limpio con los emojis solicitados y sin caracteres extraños
        elemento.innerHTML = `🧪 🧫 LABORATORIO CLÍNICO<br><span style="font-size: 14px; font-weight: 500;">📅 ${fechaStr.toUpperCase()} \ ⏰${horaStr}</span>`;
    }
}, 1000);

function activarSistema() {
    const key = document.getElementById('licenseKey').value;
    
    fetch('/api/verificar-licencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('¡Sistema activado con éxito!');
            document.getElementById('licencia-container').style.display = 'none';
            document.getElementById('dashboard-container').style.display = 'block';
            chequearInventario();
        } else {
            document.getElementById('mensajeError').innerText = data.message;
        }
    })
    .catch(err => console.error('Error:', err));
}

// Alerta automática de inventario ampliada con los nuevos insumos
function chequearInventario() {
    const itemsInv = [
        { id: 'invTapaRoja', alerta: 'alertaRoja', min: 30 },
        { id: 'invTapaMorada', alerta: 'alertaMorada', min: 30 },
        { id: 'invJeringas', alerta: 'alertaJeringas', min: 20 },
        { id: 'invAgujas', alerta: 'alertaAgujas', min: 15 },
        { id: 'invTorundas', alerta: 'alertaTorundas', min: 50 },
        { id: 'invLancetas', alerta: 'alertaLancetas', min: 40 },
        { id: 'invLaminas', alerta: 'alertaLaminas', min: 25 },
        { id: 'invFrascos', alerta: 'alertaFrascos', min: 20 }
    ];

    itemsInv.forEach(i => {
        const val = parseInt(document.getElementById(i.id).value) || 0;
        const span = document.getElementById(i.alerta);
        if (val <= i.min) {
            span.innerText = `⚠️ ¡Stock bajo (${val} disp.)!`;
            span.style.color = '#e74c3c';
        } else {
            span.innerText = `✅ Stock normal (${val})`;
            span.style.color = '#27ae60';
        }
    });
}

function formatoVenezolano(numero, moneda = '') {
    let partes = numero.toFixed(2).split('.');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return partes.join(',') + (moneda ? ' ' + moneda : '');
}

function calcularTotales() {
    let sumaDolares = 0;

    const items = document.querySelectorAll('.exam-item');
    items.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        const inputPrecio = item.querySelector('.exam-price');

        if (checkbox && checkbox.checked) {
            const precio = parseFloat(inputPrecio.value) || 0;
            sumaDolares += precio;
        }
    });

    const tasaUsd = parseFloat(document.getElementById('tasaUsd').value) || 1;
    const tasaEur = parseFloat(document.getElementById('tasaEur').value) || 1;

    const totalBs = sumaDolares * tasaUsd;
    const totalEur = tasaEur > 0 ? sumaDolares * (tasaUsd / tasaEur) : 0;

    document.getElementById('totalDolares').innerText = formatoVenezolano(sumaDolares, '$');
    document.getElementById('totalBolivares').innerText = formatoVenezolano(totalBs, 'Bs');
    document.getElementById('totalEuros').innerText = formatoVenezolano(totalEur, '€');

    const abonado = parseFloat(document.getElementById('montoAbonado').value) || 0;
    const restante = sumaDolares - abonado;
    const infoRestante = document.getElementById('infoRestante');
    
    if (abonado > 0 && restante > 0) {
        infoRestante.innerText = `⚠️ El paciente dejó un ABONO. Quedan debiendo: $${formatoVenezolano(restante)} (${formatoVenezolano(restante * tasaUsd)} Bs)`;
    } else if (abonado >= sumaDolares && sumaDolares > 0) {
        infoRestante.innerText = `✅ ¡Orden pagada en su totalidad!`;
    } else {
        infoRestante.innerText = ``;
    }

    document.getElementById('monto').value = sumaDolares.toFixed(2);
}

document.addEventListener('DOMContentLoaded', () => {
    const formPago = document.getElementById('formPago');
    if (formPago) {
        formPago.addEventListener('submit', (e) => {
            e.preventDefault();
            const paciente = document.getElementById('paciente').value;
            const cedula = document.getElementById('cedula').value;
            const telefono = document.getElementById('telefono').value;
            const direccion = document.getElementById('direccion').value;
            const monto = parseFloat(document.getElementById('monto').value) || 0;
            const metodo = document.getElementById('metodo').value;
            const abonado = parseFloat(document.getElementById('montoAbonado').value) || 0;

            const examenesSeleccionados = [];
            const items = document.querySelectorAll('.exam-item');
            items.forEach(item => {
                const checkbox = item.querySelector('input[type="checkbox"]');
                const inputPrecio = item.querySelector('.exam-price');
                if (checkbox && checkbox.checked) {
                    examenesSeleccionados.push(`${checkbox.value} ($${inputPrecio.value})`);
                }
            });

            if (examenesSeleccionados.length === 0) {
                alert('Por favor seleccione al menos un examen de laboratorio.');
                return;
            }

            const detallePago = abonado > 0 ? `${metodo} (Abonó: $${abonado})` : metodo;

            fetch('/api/pagos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    paciente, 
                    cedula, 
                    telefono, 
                    direccion, 
                    examenes: examenesSeleccionados, 
                    monto, 
                    metodo: detallePago 
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert('¡Orden registrada con éxito! Ya puede imprimir el recibo.');
                    formPago.reset();
                    calcularTotales();
                } else {
                    alert('Error al registrar la orden');
                }
            })
            .catch(err => console.error('Error:', err));
        });
    }
});