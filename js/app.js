// Notificaciones Web
if ('Notification' in window && Notification.permission !== 'granted') {
  Notification.requestPermission();
}
// CONFIGURACIÓN THINGSPEAK
const channelID = "3334837";
const urlGrafico = `https://api.thingspeak.com/channels/${channelID}/feeds.json?days=1`;
const urlUltimo = `https://api.thingspeak.com/channels/${channelID}/feeds/last.json`;

// Rangos de alerta (valores por defecto)
let tempMin = 18;
let tempMax = 24;
let humMin = 50;
let humMax = 70;

function mostrarConfigRangos() {
  const form = document.getElementById('formRangos');
  if (form) {
    form.style.display = 'flex';
    const card = form.closest('.card');
    if (card) card.style.display = 'block';
  }
  const floating = document.getElementById('floatingConfigBtn');
  if (floating) floating.style.display = 'none';
}

function actualizarRangos() {
  tempMin = parseFloat(document.getElementById('tempMin').value);
  tempMax = parseFloat(document.getElementById('tempMax').value);
  humMin = parseFloat(document.getElementById('humMin').value);
  humMax = parseFloat(document.getElementById('humMax').value);
  const form = document.getElementById('formRangos');
  if (form) {
    form.style.display = 'none';
    const card = form.closest('.card');
    if (card) card.style.display = 'none';
  }
  const floating = document.getElementById('floatingConfigBtn');
  if (floating) floating.style.display = 'inline-block';
  obtenerDatos();
  obtenerDatosPorFecha();
}

// GRÁFICO TEMPERATURA
const ctxTemp = document.getElementById('graficoTemperatura');
const graficoTemp = new Chart(ctxTemp, {
  type: 'line',
  data: { labels: [], datasets: [{ label: 'Temperatura °C', data: [], borderWidth: 3, tension: 0.4 }] },
  options: { responsive: true, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: true } } }
});
// GRÁFICO HUMEDAD
const ctxHum = document.getElementById('graficoHumedad');
const graficoHum = new Chart(ctxHum, {
  type: 'line',
  data: { labels: [], datasets: [{ label: 'Humedad %', data: [], borderWidth: 3, tension: 0.4 }] },
  options: { responsive: true, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: true } } }
});

// OBTENER DATOS ACTUALES
async function obtenerDatos() {
  try {
    document.getElementById('spinner').style.display = 'block';
    const respUltimo = await fetch(urlUltimo);
    const ultimo = await respUltimo.json();
    let ultimaTemp = parseFloat(ultimo.field1);
    let ultimaHum = parseFloat(ultimo.field2);
    let iconoTemp = '';
    let iconoHum = '';

    if (!isNaN(ultimaTemp)) {
      if (ultimaTemp < tempMin) {
        iconoTemp = '<span class="icono-alerta" aria-label="Alerta temperatura">&#9888;</span>';
        document.getElementById("estadoTemp").innerHTML = iconoTemp + "Hace frío - Foco ENCENDIDO";
        document.getElementById("estadoTemp").className = "estado alerta";
        mostrarNotificacion('Alerta: Hace frío', `Temperatura: ${ultimaTemp} °C`);
      } else if (ultimaTemp > tempMax) {
        iconoTemp = '<span class="icono-alerta" aria-label="Alerta temperatura">&#9888;</span>';
        document.getElementById("estadoTemp").innerHTML = iconoTemp + "Hace calor - Ventilador ENCENDIDO";
        document.getElementById("estadoTemp").className = "estado alerta";
        mostrarNotificacion('Alerta: Hace calor', `Temperatura: ${ultimaTemp} °C`);
      } else {
        iconoTemp = '<span class="icono-normal" aria-label="Temperatura normal">&#10003;</span>';
        document.getElementById("estadoTemp").innerHTML = iconoTemp + "Temperatura NORMAL";
        document.getElementById("estadoTemp").className = "estado normal";
      }
    } else {
      document.getElementById("estadoTemp").innerHTML = "Esperando datos...";
      document.getElementById("estadoTemp").className = "estado";
    }

    if (!isNaN(ultimaHum)) {
      if (ultimaHum < humMin || ultimaHum > humMax) {
        iconoHum = '<span class="icono-alerta" aria-label="Alerta humedad">&#9888;</span>';
        document.getElementById("estadoHum").innerHTML = iconoHum + "Humedad fuera de rango";
        document.getElementById("estadoHum").className = "estado alerta";
        mostrarNotificacion('Alerta: Humedad fuera de rango', `Humedad: ${ultimaHum} %`);
      } else {
        iconoHum = '<span class="icono-normal" aria-label="Humedad normal">&#10003;</span>';
        document.getElementById("estadoHum").innerHTML = iconoHum + "Humedad NORMAL";
        document.getElementById("estadoHum").className = "estado normal";
      }
    } else {
      document.getElementById("estadoHum").innerHTML = "Esperando datos...";
      document.getElementById("estadoHum").className = "estado";
    }

    document.getElementById("temperatura").innerHTML = isNaN(ultimaTemp) ? '-- °C' : ultimaTemp + " °C";
    document.getElementById("humedad").innerHTML = isNaN(ultimaHum) ? '-- %' : ultimaHum + " %";

    const response = await fetch(urlGrafico);
    const data = await response.json();
    const feeds = data.feeds.filter(feed => feed.field1 && feed.field2 && !isNaN(parseFloat(feed.field1)) && !isNaN(parseFloat(feed.field2)));

    let horas = {};
    feeds.forEach(feed => {
      let temp = parseFloat(feed.field1);
      let hum = parseFloat(feed.field2);
      let fecha = new Date(feed.created_at);
      let hora = String(fecha.getHours()).padStart(2, '0') + ":00";
      if (!horas[hora]) horas[hora] = { temperaturas: [], humedades: [] };
      horas[hora].temperaturas.push(temp);
      horas[hora].humedades.push(hum);
    });

    let labels = [], temperaturasProm = [], humedadesProm = [];
    for (let hora in horas) {
      labels.push(hora);
      let temps = horas[hora].temperaturas;
      let hums = horas[hora].humedades;
      let promedioTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
      let promedioHum = hums.reduce((a, b) => a + b, 0) / hums.length;
      temperaturasProm.push(promedioTemp.toFixed(2));
      humedadesProm.push(promedioHum.toFixed(2));
    }

    graficoTemp.data.labels = labels;
    graficoTemp.data.datasets[0].data = temperaturasProm;
    graficoTemp.data.datasets[0].backgroundColor = temperaturasProm.map(t => t < tempMin || t > tempMax ? 'rgba(255,99,132,0.2)' : 'rgba(75,192,192,0.2)');
    graficoTemp.data.datasets[0].borderColor = temperaturasProm.map(t => t < tempMin || t > tempMax ? 'rgba(255,99,132,1)' : 'rgba(75,192,192,1)');
    graficoTemp.update();

    graficoHum.data.labels = labels;
    graficoHum.data.datasets[0].data = humedadesProm;
    graficoHum.data.datasets[0].backgroundColor = humedadesProm.map(h => h < humMin || h > humMax ? 'rgba(255,99,132,0.2)' : 'rgba(75,192,192,0.2)');
    graficoHum.data.datasets[0].borderColor = humedadesProm.map(h => h < humMin || h > humMax ? 'rgba(255,99,132,1)' : 'rgba(75,192,192,1)');
    graficoHum.update();

    document.getElementById('spinner').style.display = 'none';
  } catch (error) {
    document.getElementById('spinner').style.display = 'none';
    alert('Error al obtener datos. Verifica tu conexión.');
    console.log(error);
  }
}

// FILTRAR POR FECHA
async function obtenerDatosPorFecha() {
  try {
    document.getElementById('spinner').style.display = 'block';
    const fechaInput = document.getElementById("fechaSeleccionada").value;
    if (!fechaInput) { document.getElementById('spinner').style.display = 'none'; return; }
    const response = await fetch(`https://api.thingspeak.com/channels/${channelID}/feeds.json?days=30`);
    const data = await response.json();
    const feeds = data.feeds.filter(feed => feed.field1 && feed.field2 && !isNaN(parseFloat(feed.field1)) && !isNaN(parseFloat(feed.field2)));
    document.getElementById("listaAlertasTemp").innerHTML = "";
    document.getElementById("listaAlertasHum").innerHTML = "";

    const resumen = {
      temp: { suma: 0, count: 0, min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
      hum: { suma: 0, count: 0, min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY }
    };

    feeds.forEach(feed => {
      let fecha = new Date(feed.created_at);
      let fechaFeed = fecha.getFullYear() + "-" + String(fecha.getMonth() + 1).padStart(2, '0') + "-" + String(fecha.getDate()).padStart(2, '0');
      if (fechaFeed == fechaInput) {
        let temp = parseFloat(feed.field1);
        let hum = parseFloat(feed.field2);
        resumen.temp.suma += temp;
        resumen.temp.count += 1;
        resumen.temp.min = Math.min(resumen.temp.min, temp);
        resumen.temp.max = Math.max(resumen.temp.max, temp);
        resumen.hum.suma += hum;
        resumen.hum.count += 1;
        resumen.hum.min = Math.min(resumen.hum.min, hum);
        resumen.hum.max = Math.max(resumen.hum.max, hum);
        let hora = fecha.getHours() + ":" + fecha.getMinutes() + ":" + fecha.getSeconds();
        if (temp < tempMin) agregarAlerta("Hace frío (" + temp + " °C) - " + hora, 'temp');
        if (temp > tempMax) agregarAlerta("Hace calor (" + temp + " °C) - " + hora, 'temp');
        if (hum < humMin) agregarAlerta("Humedad baja (" + hum + "% ) - " + hora, 'hum');
        if (hum > humMax) agregarAlerta("Humedad alta (" + hum + "% ) - " + hora, 'hum');
      }
    });

    const resumenDia = document.getElementById('resumenDia');
    resumenDia.innerHTML = '';
    if (resumen.temp.count > 0 || resumen.hum.count > 0) {
      if (resumen.temp.count > 0) {
        const avgTemp = (resumen.temp.suma / resumen.temp.count).toFixed(2);
        resumenDia.innerHTML += `<div style="background:#f4f4f4;padding:12px;border-radius:10px;box-shadow:0 0 8px rgba(0,0,0,0.08);flex:1;min-width:200px;">
          <h4>Temperatura</h4>
          <p>Promedio: ${avgTemp} °C</p>
          <p>Mínima: ${resumen.temp.min.toFixed(2)} °C</p>
          <p>Máxima: ${resumen.temp.max.toFixed(2)} °C</p>
        </div>`;
      }
      if (resumen.hum.count > 0) {
        const avgHum = (resumen.hum.suma / resumen.hum.count).toFixed(2);
        resumenDia.innerHTML += `<div style="background:#f4f4f4;padding:12px;border-radius:10px;box-shadow:0 0 8px rgba(0,0,0,0.08);flex:1;min-width:200px;">
          <h4>Humedad</h4>
          <p>Promedio: ${avgHum} %</p>
          <p>Mínima: ${resumen.hum.min.toFixed(2)} %</p>
          <p>Máxima: ${resumen.hum.max.toFixed(2)} %</p>
        </div>`;
      }
    } else {
      resumenDia.innerHTML = `<div style="width:100%;color:#555;">No hay registros para esta fecha.</div>`;
    }
    document.getElementById('spinner').style.display = 'none';
  } catch (error) {
    document.getElementById('spinner').style.display = 'none';
    alert('Error al obtener alertas.');
    console.log(error);
  }
}

function agregarAlerta(texto, tipo) {
  let li = document.createElement("li");
  li.innerHTML = texto;
  li.setAttribute('tabindex','0');
  if (tipo === 'temp') {
    document.getElementById("listaAlertasTemp").appendChild(li);
  } else if (tipo === 'hum') {
    document.getElementById("listaAlertasHum").appendChild(li);
  }
}

function exportarDatos() {
  let fechaInput = document.getElementById('fechaSeleccionada').value;
  if (!fechaInput) { alert('Selecciona una fecha primero.'); return; }
  const url = `https://api.thingspeak.com/channels/${channelID}/feeds.json?days=30`;
  fetch(url)
    .then(resp => resp.json())
    .then(data => {
      const feeds = data.feeds.filter(feed => feed.field1 && feed.field2 && !isNaN(parseFloat(feed.field1)) && !isNaN(parseFloat(feed.field2)));
      const filas = [];
      filas.push(['FechaHora','Temperatura','Humedad'].join(','));
      feeds.forEach(feed => {
        const fecha = new Date(feed.created_at);
        const fechaFeed = fecha.getFullYear() + '-' + String(fecha.getMonth()+1).padStart(2,'0') + '-' + String(fecha.getDate()).padStart(2,'0');
        if (fechaFeed === fechaInput) {
          const hora = fecha.getHours() + ':' + fecha.getMinutes() + ':' + fecha.getSeconds();
          filas.push([fechaFeed + ' ' + hora, feed.field1, feed.field2].join(','));
        }
      });
      if (filas.length === 1) { alert('No hay datos para la fecha seleccionada.'); return; }
      const csv = filas.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const urlBlob = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlBlob;
      a.download = `datos_${fechaInput}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(urlBlob);
    })
    .catch(error => {
      alert('Error al exportar datos.');
      console.log(error);
    });
}

function mostrarNotificacion(titulo, cuerpo) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(titulo, { body: cuerpo, icon: 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png' });
  }
}

setInterval(obtenerDatos, 15000);
obtenerDatos();

// --- Pestañas y registros de pollos ---
function cambiarPestana(pestana) {
  const dash = document.getElementById('dashboardContenedor');
  const pollos = document.getElementById('seccionPollos');
  const tabDash = document.getElementById('tab-dashboard');
  const tabPoll = document.getElementById('tab-pollos');
  const floating = document.getElementById('floatingConfigBtn');
  if (pestana === 'pollos') {
    dash.style.display = 'none';
    pollos.style.display = 'block';
    tabDash.classList.remove('active'); tabDash.setAttribute('aria-selected','false');
    tabPoll.classList.add('active'); tabPoll.setAttribute('aria-selected','true');
    if (floating) floating.style.display = 'none';
  } else {
    dash.style.display = 'block';
    pollos.style.display = 'none';
    tabPoll.classList.remove('active'); tabPoll.setAttribute('aria-selected','false');
    tabDash.classList.add('active'); tabDash.setAttribute('aria-selected','true');
    if (floating) floating.style.display = 'inline-block';
  }
}

function obtenerRegistrosPollos() {
  try {
    const raw = localStorage.getItem('registrosPollos');
    return raw ? JSON.parse(raw) : [];
  } catch (e) { console.log(e); return []; }
}

function guardarRegistrosPollos(lista) {
  localStorage.setItem('registrosPollos', JSON.stringify(lista));
}

function guardarRegistroPollos() {
  const pollo = document.getElementById('polloId').value.trim();
  const fechaInput = document.getElementById('fechaPollos').value;
  const peso = parseFloat(document.getElementById('pesoPollos').value);
  const comida = parseFloat(document.getElementById('comidaPollos').value);
  const fecha = fechaInput ? new Date(fechaInput).toISOString() : new Date().toISOString();
  if (!pollo) { alert('Ingresa un identificador o nombre del pollo.'); return; }
  if (isNaN(peso) || isNaN(comida)) { alert('Completa peso y comida.'); return; }
  const lista = obtenerRegistrosPollos();
  lista.unshift({ pollo, fecha, peso, comida });
  guardarRegistrosPollos(lista);
  renderListaPollos();
  document.getElementById('formPollos').reset();
}

function renderListaPollos() {
  const lista = obtenerRegistrosPollos();
  const tbody = document.querySelector('#tablaPollos tbody');
  tbody.innerHTML = '';
  const filtro = document.getElementById('filtroPollos') ? document.getElementById('filtroPollos').value : 'Todos';
  if (lista.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" style="padding:12px;color:#666;">No hay registros.</td>`;
    tbody.appendChild(tr);
    actualizarFiltroPollos();
    return;
  }
  lista.forEach((r, idx) => {
    if (filtro !== 'Todos' && r.pollo !== filtro) return;
    const tr = document.createElement('tr');
    const fecha = new Date(r.fecha);
    const fechaStr = fecha.toLocaleString();
    tr.innerHTML = `<td>${r.pollo}</td><td>${fechaStr}</td><td>${r.peso.toFixed(2)}</td><td>${r.comida}</td><td><button class="export-btn" onclick="borrarRegistroPollos(${idx})">Borrar</button></td>`;
    tbody.appendChild(tr);
  });
  actualizarFiltroPollos();
}

function actualizarFiltroPollos() {
  const select = document.getElementById('filtroPollos');
  if (!select) return;
  const lista = obtenerRegistrosPollos();
  const conjuntos = ['Todos'];
  lista.forEach(r => { if (!conjuntos.includes(r.pollo)) conjuntos.push(r.pollo); });
  const actual = select.value || 'Todos';
  select.innerHTML = '';
  conjuntos.forEach(op => {
    const o = document.createElement('option'); o.value = op; o.textContent = op; select.appendChild(o);
  });
  select.value = actual;
}

// Exportar CSV: por filtro y general
function exportPollosPorFiltro() {
  const sel = document.getElementById('filtroPollos');
  const filtro = sel ? sel.value : 'Todos';
  if (filtro === 'Todos') { exportPollosTodos(); return; }
  const lista = obtenerRegistrosPollos().filter(r => r.pollo === filtro);
  if (!lista.length) { alert('No hay registros para ' + filtro); return; }
  exportListaPollosCSV(lista, filtro);
}

function exportPollosTodos() {
  const lista = obtenerRegistrosPollos();
  if (!lista.length) { alert('No hay registros para exportar.'); return; }
  exportListaPollosCSV(lista, 'todos');
}

function exportListaPollosCSV(lista, nombre) {
  const filas = [];
  filas.push(['Pollo','FechaHora','Peso','Comida'].join(','));
  lista.forEach(r => {
    const fecha = new Date(r.fecha);
    const fechaStr = fecha.toLocaleString();
    filas.push([r.pollo, fechaStr, r.peso, r.comida].join(','));
  });
  const csv = filas.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const urlBlob = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = urlBlob;
  a.download = `registros_pollos_${nombre}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(urlBlob);
}

function borrarRegistroPollos(indice) {
  const lista = obtenerRegistrosPollos();
  if (!confirm('¿Eliminar este registro?')) return;
  lista.splice(indice,1);
  guardarRegistrosPollos(lista);
  renderListaPollos();
}

// Render inicial de registros de pollos
renderListaPollos();
// Asegurar visibilidad inicial del engranaje: solo en Dashboard
{
  const dash = document.getElementById('dashboardContenedor');
  const floating = document.getElementById('floatingConfigBtn');
  if (floating) {
    if (dash && dash.style.display === 'none') floating.style.display = 'none';
    else floating.style.display = 'inline-block';
  }
  // Asegurar que el card que contiene el formulario esté oculto si el form está oculto
  const form = document.getElementById('formRangos');
  if (form) {
    const card = form.closest('.card');
    if (card) {
      if (form.style.display === 'flex') card.style.display = 'block';
      else card.style.display = 'none';
    }
  }
}