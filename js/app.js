// Notificaciones Web
if ('Notification' in window && Notification.permission !== 'granted') {
  Notification.requestPermission();
}

// CONFIGURACIÓN FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyD77B4YWz9Qiqto3yg5xrYK8toCEhwnFOM",
  authDomain: "sistema-iot-aves.firebaseapp.com",
  projectId: "sistema-iot-aves",
  storageBucket: "sistema-iot-aves.firebasestorage.app",
  messagingSenderId: "52467825689",
  appId: "1:52467825689:web:04b29c5049946dd961be88",
  measurementId: "G-JHTPWQBY2P"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

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

    const firestoreSaves = feeds.map(feed => guardarLecturaThingSpeak(feed));

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
    const promedioPromises = [];
    for (let hora in horas) {
      labels.push(hora);
      let temps = horas[hora].temperaturas;
      let hums = horas[hora].humedades;
      let promedioTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
      let promedioHum = hums.reduce((a, b) => a + b, 0) / hums.length;
      temperaturasProm.push(promedioTemp.toFixed(2));
      humedadesProm.push(promedioHum.toFixed(2));
      promedioPromises.push(guardarPromedioHora(hora, promedioTemp, promedioHum));
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

    await Promise.allSettled([...firestoreSaves, ...promedioPromises]);
    document.getElementById('spinner').style.display = 'none';
  } catch (error) {
    document.getElementById('spinner').style.display = 'none';
    alert('Error al obtener datos. Verifica tu conexión.');
    console.log(error);
  }
}

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
      descargarCSV(csv, `datos_${fechaInput}.csv`);
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

async function cargarHistoricoFirebase() {
  try {
    const fechaFiltro = document.getElementById('fechaFiltroHistorico').value;
    let lecturasQuery = db.collection('lecturas').orderBy('fecha', 'desc');
    let promediosQuery = db.collection('promedios_hora').orderBy('fechaRegistro', 'desc');

    if (fechaFiltro) {
      const inicio = `${fechaFiltro}T00:00:00.000Z`;
      const fin = `${fechaFiltro}T23:59:59.999Z`;
      lecturasQuery = lecturasQuery.where('fecha', '>=', inicio).where('fecha', '<=', fin);
      promediosQuery = promediosQuery.where('fechaRegistro', '>=', inicio).where('fechaRegistro', '<=', fin);
    }

    const lecturasSnapshot = await lecturasQuery.get();
    const promediosSnapshot = await promediosQuery.get();

    const tablaLecturas = document.querySelector('#tablaLecturas tbody');
    tablaLecturas.innerHTML = '';
    lecturasSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      const fecha = new Date(data.fecha).toLocaleString();
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${fecha}</td><td>${data.temperatura}</td><td>${data.humedad}</td><td>${data.entry_id}</td>`;
      tablaLecturas.appendChild(tr);
    });
    if (tablaLecturas.children.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="4" style="padding:12px;color:#666;">No hay lecturas guardadas.</td>`;
      tablaLecturas.appendChild(tr);
    }

    const tablaPromedios = document.querySelector('#tablaPromedios tbody');
    tablaPromedios.innerHTML = '';
    promediosSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      const fecha = new Date(data.fechaRegistro).toLocaleDateString();
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${fecha}</td><td>${data.hora}</td><td>${Number(data.temperatura).toFixed(2)}</td><td>${Number(data.humedad).toFixed(2)}</td>`;
      tablaPromedios.appendChild(tr);
    });
    if (tablaPromedios.children.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="4" style="padding:12px;color:#666;">No hay promedios horarios guardados.</td>`;
      tablaPromedios.appendChild(tr);
    }

    document.getElementById('historicoMensajes').textContent = `Histórico cargado ${fechaFiltro ? 'para ' + fechaFiltro : 'de todas las fechas'}.`;
  } catch (error) {
    console.error(error);
    document.getElementById('historicoMensajes').textContent = 'Error al cargar el histórico desde Firebase.';
  }
}

async function exportarLecturasFirebase() {
  try {
    const snapshot = await db.collection('lecturas').orderBy('fecha', 'desc').get();
    const filas = [['FechaHora','Temperatura','Humedad','Entry ID']];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      filas.push([data.fecha, data.temperatura, data.humedad, data.entry_id]);
    });
    if (filas.length === 1) { alert('No hay lecturas para exportar.'); return; }
    const csv = filas.map(row => row.join(',')).join('\n');
    descargarCSV(csv, 'lecturas_firebase.csv');
  } catch (error) {
    console.error(error);
    alert('Error al exportar lecturas de Firebase.');
  }
}

async function exportarPromediosFirebase() {
  try {
    const snapshot = await db.collection('promedios_hora').orderBy('fechaRegistro', 'desc').get();
    const filas = [['Fecha','Hora','Temperatura promedio','Humedad promedio']];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      filas.push([data.fechaRegistro, data.hora, Number(data.temperatura).toFixed(2), Number(data.humedad).toFixed(2)]);
    });
    if (filas.length === 1) { alert('No hay promedios para exportar.'); return; }
    const csv = filas.map(row => row.join(',')).join('\n');
    descargarCSV(csv, 'promedios_hora_firebase.csv');
  } catch (error) {
    console.error(error);
    alert('Error al exportar promedios de Firebase.');
  }
}

function descargarCSV(csv, nombreArchivo) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const urlBlob = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = urlBlob;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(urlBlob);
}

async function guardarLecturaThingSpeak(feed) {
  try {
    const idLectura = feed.entry_id.toString();
    const referencia = db.collection('lecturas').doc(idLectura);
    const existe = await referencia.get();
    if (existe.exists) {
      return;
    }
    await referencia.set({
      entry_id: feed.entry_id,
      temperatura: Number(feed.field1),
      humedad: Number(feed.field2),
      fecha: feed.created_at
    });
  } catch (error) {
    console.warn('No se pudo guardar lectura en Firebase:', error);
  }
}

async function guardarPromedioHora(hora, temperatura, humedad) {
  try {
    const id = new Date().toISOString().slice(0,10) + "_" + hora;
    await db.collection('promedios_hora').doc(id).set({
      hora,
      temperatura,
      humedad,
      fechaRegistro: new Date().toISOString()
    });
  } catch (error) {
    console.warn('No se pudo guardar promedio en Firebase:', error);
  }
}

function mostrarNotificacion(titulo, cuerpo) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(titulo, { body: cuerpo, icon: 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png' });
  }
}

function cambiarPestana(pestana) {
  const dash = document.getElementById('dashboardContenedor');
  const pollos = document.getElementById('seccionPollos');
  const historico = document.getElementById('seccionHistorico');
  const tabDash = document.getElementById('tab-dashboard');
  const tabPoll = document.getElementById('tab-pollos');
  const tabHist = document.getElementById('tab-historico');
  const floating = document.getElementById('floatingConfigBtn');
  if (pestana === 'pollos') {
    dash.style.display = 'none';
    pollos.style.display = 'block';
    historico.style.display = 'none';
    tabDash.classList.remove('active'); tabDash.setAttribute('aria-selected','false');
    tabPoll.classList.add('active'); tabPoll.setAttribute('aria-selected','true');
    tabHist.classList.remove('active'); tabHist.setAttribute('aria-selected','false');
    if (floating) floating.style.display = 'none';
  } else if (pestana === 'historico') {
    dash.style.display = 'none';
    pollos.style.display = 'none';
    historico.style.display = 'block';
    tabDash.classList.remove('active'); tabDash.setAttribute('aria-selected','false');
    tabPoll.classList.remove('active'); tabPoll.setAttribute('aria-selected','false');
    tabHist.classList.add('active'); tabHist.setAttribute('aria-selected','true');
    if (floating) floating.style.display = 'none';
    cargarHistoricoFirebase();
  } else {
    dash.style.display = 'block';
    pollos.style.display = 'none';
    historico.style.display = 'none';
    tabPoll.classList.remove('active'); tabPoll.setAttribute('aria-selected','false');
    tabHist.classList.remove('active'); tabHist.setAttribute('aria-selected','false');
    tabDash.classList.add('active'); tabDash.setAttribute('aria-selected','true');
    if (floating) floating.style.display = 'inline-block';
  }
}

async function obtenerRegistrosPollos() {
  const snapshot = await db.collection('pollos').orderBy('fecha', 'desc').get();
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function guardarRegistroPollos() {
  const pollo = document.getElementById('polloId').value.trim();
  const fechaInput = document.getElementById('fechaPollos').value;
  const peso = parseFloat(document.getElementById('pesoPollos').value);
  const comida = parseFloat(document.getElementById('comidaPollos').value);
  const fecha = fechaInput ? new Date(fechaInput).toISOString() : new Date().toISOString();
  if (!pollo) { alert('Ingresa un identificador o nombre del pollo.'); return; }
  if (isNaN(peso) || isNaN(comida)) { alert('Completa peso y comida.'); return; }
  await db.collection('pollos').add({
    pollo,
    fecha,
    peso,
    comida,
    creadoEn: Date.now()
  });
  document.getElementById('formPollos').reset();
  await renderListaPollos();
}

async function renderListaPollos() {
  const lista = await obtenerRegistrosPollos();
  const tbody = document.querySelector('#tablaPollos tbody');
  tbody.innerHTML = '';
  const filtro = document.getElementById('filtroPollos') ? document.getElementById('filtroPollos').value : 'Todos';

  if (lista.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" style="padding:12px;color:#666;">No hay registros.</td>`;
    tbody.appendChild(tr);
    actualizarFiltroPollos(lista);
    return;
  }

  lista.forEach(r => {
    if (filtro !== 'Todos' && r.pollo !== filtro) return;
    const tr = document.createElement('tr');
    const fecha = new Date(r.fecha);
    const fechaStr = fecha.toLocaleString();
    tr.innerHTML = `<td>${r.pollo}</td><td>${fechaStr}</td><td>${Number(r.peso).toFixed(2)}</td><td>${Number(r.comida)}</td><td><button class="export-btn" onclick="borrarRegistroPollos('${r.id}')">Borrar</button></td>`;
    tbody.appendChild(tr);
  });
  actualizarFiltroPollos(lista);
}

function actualizarFiltroPollos(lista = []) {
  const select = document.getElementById('filtroPollos');
  if (!select) return;
  const conjuntos = ['Todos'];
  lista.forEach(r => { if (!conjuntos.includes(r.pollo)) conjuntos.push(r.pollo); });
  const actual = select.value || 'Todos';
  select.innerHTML = '';
  conjuntos.forEach(op => {
    const o = document.createElement('option'); o.value = op; o.textContent = op; select.appendChild(o);
  });
  select.value = actual;
}

async function exportPollosPorFiltro() {
  const sel = document.getElementById('filtroPollos');
  const filtro = sel ? sel.value : 'Todos';
  const lista = await obtenerRegistrosPollos();
  const filtrada = filtro === 'Todos' ? lista : lista.filter(r => r.pollo === filtro);
  if (!filtrada.length) { alert('No hay registros para ' + filtro); return; }
  exportListaPollosCSV(filtrada, filtro);
}

async function exportPollosTodos() {
  const lista = await obtenerRegistrosPollos();
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
  descargarCSV(csv, `registros_pollos_${nombre}.csv`);
}

async function borrarRegistroPollos(id) {
  if (!confirm('¿Eliminar registro?')) return;
  await db.collection('pollos').doc(id).delete();
  await renderListaPollos();
}

renderListaPollos();

// Asegurar visibilidad inicial del engranaje: solo en Dashboard
{
  const dash = document.getElementById('dashboardContenedor');
  const floating = document.getElementById('floatingConfigBtn');
  if (floating) {
    if (dash && dash.style.display === 'none') floating.style.display = 'none';
    else floating.style.display = 'inline-block';
  }
  const form = document.getElementById('formRangos');
  if (form) {
    const card = form.closest('.card');
    if (card) {
      if (form.style.display === 'flex') card.style.display = 'block';
      else card.style.display = 'none';
    }
  }
}

setInterval(obtenerDatos, 15000);
obtenerDatos();
