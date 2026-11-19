import { $ } from "./dom.js";

export function pedirPermissaoNotificacao() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function dispararAviso(texto) {
  $("#aviso").textContent = texto;
  $("#aviso").hidden = false;
  navigator.vibrate?.([300, 150, 300]);
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Meu ônibus está chegando", { body: texto });
  }
}

export function esconderAviso() {
  $("#aviso").hidden = true;
}
