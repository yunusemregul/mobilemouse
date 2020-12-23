//@ts-ignore
function exports() { }

import electron from 'electron';
import * as QRCode from 'qrcode';
import $ from 'jquery';

const ipc = electron.ipcRenderer;

ipc.on("get_pc_info", function (event, arg) {
    $('#lan_ip').text(arg.ip);
    $('#computer_name').text(arg.name);

    QRCode.toCanvas(document.getElementById('qrcanvas'), arg.ip, {
        margin: 0,
        width: 300,
        color: {
            dark: '#111',
            light: '#07e58e'
        }
    })
});

$(function () {
    ipc.send("get_pc_info");
})


/*

var qrcode = new QRCode(document.getElementById("qrcode"), {
    width: 300,
    height: 300,
    colorDark: "#111",
    colorLight: "#07e58e",
  });
  qrcode.makeCode("192.168.2.8");

  */