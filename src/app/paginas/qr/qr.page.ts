import { Component, OnInit } from '@angular/core';
import html2canvas from 'html2canvas';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { AlertController, LoadingController, ModalController, Platform, ToastController} from '@ionic/angular';
import { BarcodeScanningModalComponent } from './barcode-scanning-modal.component';
import { LensFacing, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Clipboard } from '@capacitor/clipboard';
import { Browser } from '@capacitor/browser';

@Component({
  selector: 'app-qr',
  templateUrl: './qr.page.html',
  styleUrls: ['./qr.page.scss'],
})
export class QrPage implements OnInit {
  segment = 'scan';
  qrtext = '';

  scanResult = '';

  constructor(
    private loadingController: LoadingController,
    private platform: Platform,
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit(): void {
    if (this.platform.is('capacitor')) {
      BarcodeScanner.isSupported().then;
      BarcodeScanner.checkPermissions().then;
      BarcodeScanner.removeAllListeners();
    }
  }

  async startScan() {
    const modal = await this.modalController.create({
      component: BarcodeScanningModalComponent,
      cssClass: 'barcode-scanning-modal',
      showBackdrop: false,
      componentProps: {
        formats: [],
        LensFacing: LensFacing.Back,
      },
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) {
      this.scanResult = data?.barcode?.displayValue;
    }
  }

  async readBarcodeFromImage() {
    const { files } = await FilePicker.pickImages({ multiple: false });
    const path = files[0]?.path;

    if (!path) return;

    const { barcodes } = await BarcodeScanner.readBarcodesFromImage({
      path,
      formats: [],
    });

    this.scanResult = barcodes[0].displayValue;
  }

  capturarImg() {
    const element = document.getElementById('qrimg') as HTMLElement;

    html2canvas(element).then((canvas: HTMLCanvasElement) => {
      this.generarImg(canvas);
      if (this.platform.is('capacitor')) this.generarImgAndroid(canvas);
      else this.generarImg(canvas);
    });
  }

  generarImg(canvas: HTMLCanvasElement) {
    const link = document.createElement('a');
    link.href = canvas.toDataURL();
    link.download = 'mi_codigo_qr.png';
    link.click();
  }

  async generarImgAndroid(canvas: HTMLCanvasElement) {
    let bse64 = canvas.toDataURL();
    let path = 'mi_codigo_qr.png';

    const loading = await this.loadingController.create({ spinner: 'bubbles' });
    await loading.present();

    await Filesystem.writeFile({
      path,
      data: bse64,
      directory: Directory.Cache,
    })
      .then(async (res) => {
        let uri = res.uri;

        await Share.share({ url: uri });

        await Filesystem.deleteFile({
          path,
          directory: Directory.Cache,
        });
      })
      .finally(() => {
        loading.dismiss();
      });
  }

  writeToClipboard = async () => {
    await Clipboard.write({
      string: this.scanResult,
    });

    const toast = await this.toastController.create({
      message: 'Copiado a Portapapeles',
      duration: 2000,
      color: 'tertiary',
      icon: 'clipboard-outline',
      position: 'middle',
    });
    toast.present();
    console.log('copied');
  };

  openCapacitorSite = async () => {
    const alert = await this.alertController.create({
      header: 'Confirmar!',
      message: '¿Quieres abrir este enlace?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
        },
        {
          text: 'Sí',
          handler: async () => {
            let url = this.scanResult;

            // Verifica si el enlace comienza con "https://", de lo contrario, agrégalo
            if (!this.scanResult.startsWith('https://')) {
              url = 'https://' + this.scanResult;
            }

            // Abre el enlace en el navegador
            await Browser.open({ url });
          },
        },
      ],
    });

    await alert.present();
  };

  isUrl() {
    let regex = /\.(com|net|io|me|crypto|ai)\b/i;
    return regex.test(this.scanResult);
  }
}
