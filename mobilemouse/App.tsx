import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  Text,
  View,
  AppRegistry,
  TouchableOpacity,
} from 'react-native';
import {NetworkInfo} from 'react-native-network-info';
import {name as appName} from './app.json';
import dgram from 'react-native-udp';
import UdpSocket from 'react-native-udp/lib/types/UdpSocket';

const PORT = 41414;

// TODO: separate this file into smaller components, improve the UI

let uSocket: UdpSocket;
let connectedIp: string;
let dragData = {lastX: 0, lastY: 0, startX: 0, startY: 0};

let desktopFinder  = dgram.createSocket({type: 'udp4'});
desktopFinder.on('message', (msg, rinfo) => {
  msg = JSON.parse(JSON.stringify(msg));

})
desktopFinder.bind(PORT+2);

function App() {
  const [desktopIPs, setDesktopIPs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  console.log('re render new');

  // TODO: learn what useAsync is
  async function findDesktops() {

  }

  // sends udp message to server
  async function sendUDP(operation: string, data: any) {
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

  useEffect(() => {
    findDesktops();
  }, []);

  return (
    <SafeAreaView style={{flex: 1}}>
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
                {desktopIPs.map((ip) => (
                  <TouchableOpacity
                    onPress={() => {
                      setIsConnected(true);
                      connectedIp = ip;
                      uSocket = dgram.createSocket({type: 'udp4'});
                      uSocket.bind(PORT + 1);
                    }}
                    key={ip}
                    style={{
                      backgroundColor: '#555',
                      padding: 12,
                      width: '100%',
                      marginTop: 8,
                    }}>
                    <View style={{}}>
                      <Text style={{color: '#00ff00', fontSize: 16}}>{ip}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: '#666',
                  marginTop: 12,
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
                onPress={findDesktops}>
                <Text style={{color: '#ffff00', fontWeight: 'bold'}}>
                  REFRESH
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

AppRegistry.registerComponent(appName, () => App);
