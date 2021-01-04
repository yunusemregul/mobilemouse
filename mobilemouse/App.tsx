import React, {useEffect, useState} from 'react';
import {
  AppRegistry,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {getDeviceName} from 'react-native-device-info';
import TcpSocket from 'react-native-tcp-socket';
import TypeTcpSocket from 'react-native-tcp-socket/lib/types/TcpSocket';
import dgram from 'react-native-udp';
import UdpSocket from 'react-native-udp/lib/types/UdpSocket';
import {name as appName} from './app.json';
import KeepAwake from 'react-native-keep-awake';

const PORT = 41414;

// TODO: separate this file into smaller components, improve the UI
// TODO: sometimes you cant click on touchableopacities

let uSocket: UdpSocket;
let connectedIp: string;
let dragData = {lastX: 0, lastY: 0, startX: 0, startY: 0};

let desktops: any[] = [];

let tcpClient: TypeTcpSocket;

function App() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [rerenderer, setRerenderer] = useState<any[]>([]);
  /*
    rerenderer:
      I use this to rerender this component when a new desktop is found by desktopFinder udp socket.
      Normally I could do this with a state for desktops, it would rerender when that state changes but somehow when I do it that way,
      desktops state doesnt seem to change. I have to search why this happens but for now it works like this.
  */
  console.log('re render');

  // sends udp message to server
  function sendUDP(operation: string, data: any) {
    uSocket.send(
      JSON.stringify({operation: operation, ...data}),
      undefined,
      undefined,
      PORT + 1,
      connectedIp,
      function (err) {
        if (err) throw err;
      },
    );
  }

  function sendTCP(operation: string, data: any) {
    tcpClient.write(
      JSON.stringify({operation: operation, ...data}),
      'ascii',
      function (err) {
        if (err) throw err;
      },
    );
  }

  function onDisconnect() {
    desktops = [];
    setIsConnected(false);
  }

  function connect(ip: string) {
    uSocket = dgram.createSocket({type: 'udp4'});
    uSocket.bind(PORT + 1);

    tcpClient = TcpSocket.createConnection({host: ip, port: PORT + 1}, () => {
      getDeviceName().then((deviceName) => {
        sendTCP('connect', {name: deviceName});
        console.log('sent connection msg from tcp');
      });
    });

    tcpClient.on('data', (msg) => {
      msg = msg.toString();

      if (msg === 'ping') {
        tcpClient.write('pong');
      }
    });

    setIsConnected(true);
    connectedIp = ip;

    tcpClient.on('close', () => {
      onDisconnect();
    });
  }

  useEffect(() => {
    let desktopFinder = dgram.createSocket({type: 'udp4'});
    desktopFinder.on('message', (msg, rinfo) => {
      msg = JSON.parse(msg.toString());

      const inDesktops = desktops.find((desk) => desk.ip === msg.ip);
      if (inDesktops == null) {
        desktops.push({...msg, lastReceived: Date.now()});
        setRerenderer([]); // TODO: this is very hacky, makes me uncomfortable
      } else {
        const index = desktops.indexOf(inDesktops);
        desktops[index] = {...inDesktops, lastReceived: Date.now()};
      }
    });
    desktopFinder.bind(PORT + 2);

    setInterval(() => {
      if (!isConnected) {
        let changeMade = false;
        desktops = desktops.filter((desktop) => {
          if ((Date.now() - desktop.lastReceived) > 2000) {
            changeMade = true;
            return false;
          }
          return true;
        });

        if (changeMade) setRerenderer([]);
      }
    }, 500);
  }, []);

  return (
    <SafeAreaView style={{flex: 1}}>
      <KeepAwake />
      {isConnected ? (
        <>
          <View
            style={{
              backgroundColor: '#222',
              flex: 1,
              flexDirection: 'row',
              justifyContent: 'center',
            }}
            onStartShouldSetResponder={() => true}
            onResponderStart={(e) => {
              dragData.startX = e.nativeEvent.pageX;
              dragData.startY = e.nativeEvent.pageY;
              dragData.lastX = e.nativeEvent.pageX;
              dragData.lastY = e.nativeEvent.pageY;
            }}
            onResponderRelease={(e) => {
              if (
                e.nativeEvent.pageX === dragData.startX &&
                e.nativeEvent.pageY === dragData.startY
              ) {
                sendUDP('click', {});
              }
            }}
            onMoveShouldSetResponder={() => true}
            onResponderMove={(e) => {
              sendUDP('move', {
                x: Math.round(e.nativeEvent.pageX - dragData.lastX),
                y: Math.round(e.nativeEvent.pageY - dragData.lastY),
              });
              dragData.lastX = e.nativeEvent.pageX;
              dragData.lastY = e.nativeEvent.pageY;
            }}>
            <Text style={{color: '#fff', top: 60, textAlign: 'center'}}>
              Drag around to control your mouse!
            </Text>
          </View>
        </>
      ) : (
        <>
          <View
            style={{
              backgroundColor: '#444',
              flex: 1,
              flexDirection: 'row',
            }}>
            <View style={{padding: 12, width: '100%'}}>
              <Text style={{color: '#fff', fontSize: 20}}>
                Connectable devices:
              </Text>
              <View style={{display: 'flex', flexDirection: 'row'}}>
                {desktops.map((desktop) => {
                  if (Date.now() - desktop.lastReceived > 2000) {
                    return;
                  }

                  return (
                    <TouchableOpacity
                      onPress={() => connect(desktop.ip)}
                      key={desktop.ip}
                      style={{
                        backgroundColor: '#555',
                        padding: 12,
                        width: '100%',
                        marginTop: 8,
                      }}>
                      <View style={{}}>
                        <Text style={{color: '#00ff00', fontSize: 16}}>
                          {desktop.name + ' (' + desktop.ip + ')'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{display: 'flex', flexDirection: 'row'}}></View>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

AppRegistry.registerComponent(appName, () => App);
