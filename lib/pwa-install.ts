let deferredPrompt: any;

export function initPWAInstall(buttonId: string) {
  const installBtn = document.getElementById(buttonId);
  if (!installBtn) return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = "inline-block"; // mostra o botão
  });

  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log("Instalação PWA:", outcome);

    deferredPrompt = null;
    installBtn.style.display = "none"; // esconde após instalar
  });
}