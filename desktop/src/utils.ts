import localIpV4Address from 'local-ipv4-address';
import os from 'os';

/**
 * finds the ipv4 address of the network interface that connects to the internet
 * @returns ipv4 address and network mask
 */
export async function getNetworkInfo() {
    var ipv4 = await localIpV4Address();

    var interfaces = os.networkInterfaces();

    for (var interfaceName in interfaces) {
        for (var interfaceDataIndex in interfaces[interfaceName]) {
            var interfaceData = interfaces[interfaceName][interfaceDataIndex];
            if (interfaceData.address === ipv4) {
                return { address: ipv4, mask: interfaceData.netmask };
            }
        }
    }

    return null;
}

/**
 * splits given ip to int array
 * @param ip ip string
 * @returns split ip array
 */
function ipToNumberArray(ip: string) {
    return ip.split('.').map((value) => parseInt(value));
}

/**
 * calculates the broadcast ip of local network 
 * https://en.wikipedia.org/wiki/Broadcast_address
 * @returns broadcast ip of lan
 */
export async function getBroadcastIP() {
    const networkInfo = await getNetworkInfo();

    const ipv4Parts = ipToNumberArray(networkInfo.address);
    const subnetParts = ipToNumberArray(networkInfo.mask);

    const networkAddress = ipv4Parts.map((value, i) => (value & subnetParts[i]));

    const broadcastIp = networkAddress.map((value, i) => (value | ~subnetParts[i] + 256));

    return broadcastIp.join('.');
}