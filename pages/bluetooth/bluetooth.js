// pages/bluetooth/bluetooth.js


// ArrayBuffer转16进度字符串示例
function ab2hex(buffer) {
    var hexArr = Array.prototype.map.call(
        new Uint8Array(buffer),
        function (bit) {
            return ('00' + bit.toString(16)).slice(-2)
        }
    )
    return hexArr.join('');
}

// 这里只是搜索指定的service，如果要搜索其他的可以把用到下面这三个值进行判断的地方去掉
const SERVICE_UUID = "CDD1"
const CHARACTERISTIC_READ_UUID = "CDD2"
const CHARACTERISTIC_WRITE_UUID = "CDD3"

Page({
    data: {
        devices:[],
        selectedDeviceId:null
    },
    onLoad: function (options) {
        this.open()
    },
    open: function () {
        const z = this
        z.onDeviceFound()
        z.onAdapterStateChange()
        z.onConnectionStateChange()
        z.onCharacteristicValueChange()

        wx.openBluetoothAdapter({
            success: function (res) {
                console.log(res)

                z.scan()
            },
            fail: function (res) {
                console.log(res)
            }
        })
    },
    scan: function() {
        this.setData({
            devices: []
        })
        // 以微信硬件平台的蓝牙智能灯为例，主服务的 UUID 是 FEE7。传入这个参数，只搜索主服务 UUID 为 FEE7 的设备
        wx.startBluetoothDevicesDiscovery({
            services:[SERVICE_UUID],
            success: function (res) {
                console.log(res)
            }
        })
    },
    stopScan: function() {
        wx.stopBluetoothDevicesDiscovery({
            success: function (res) {
                console.log(res)
            }
        })
    },
    close: function() {
        wx.closeBluetoothAdapter({
            success: function (res) {
                console.log(res)
            },
            fail: function (res) {
                console.log(res)
            }
        })
    },
    connect: function(e) {
        let deviceId = e.currentTarget.dataset.deviceId

        wx.createBLEConnection({
            // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接 
            deviceId: deviceId,
            success: function (res) {
                console.log(res)
            }
        })
    },
    getAdapterState: function() {
        wx.getBluetoothAdapterState({
            success: function (res) {
                console.log(res)
            }
        })
    },
    onAdapterStateChange: function() {
        wx.onBluetoothAdapterStateChange(function (res) {
            console.log(`adapterState changed, now is`, res)
        })
    },
    onDeviceFound: function() {
        const z = this
        wx.onBluetoothDeviceFound(function (res) {
            let devices = z.data.devices
            let device = res.devices[0]
            let deviceIds = devices.map(function(item){
                return item.deviceId
            })
            let index = deviceIds.indexOf(device.deviceId)
            if (index == -1) {
                console.log('new device list has founded')
                devices.push(device)

                console.log(devices)
            }
            else {
                devices[index] = device
            }

            z.setData({
                devices: devices
            })

            if (device.hasOwnProperty('advertisData')) {
                console.log(device.name +'.advertisData:')
                console.log(ab2hex(device.advertisData))
            }
        })
    },
    onConnectionStateChange: function() {
        const z = this
        wx.onBLEConnectionStateChange(function (res) {
            // 该方法回调中可以用于处理连接意外断开等异常情况
            console.log(`device ${res.deviceId} state has changed, connected: ${res.connected}`)
            
            if (res.connected) {
                z.setData({
                    selectedDeviceId: res.deviceId
                })
                z.getInfo(res.deviceId)
            }
            else {
                z.setData({
                    selectedDeviceId: null
                })
            }
        })
    },
    onCharacteristicValueChange: function() {
        // 必须在这里的回调才能获取
        wx.onBLECharacteristicValueChange(function (characteristic) {
            // console.log('characteristic value comed:', characteristic)
            console.log('onBLECharacteristicValueChange='+ab2hex(characteristic.value))
        })
    },
    getInfo: function (deviceId) {
        const z = this
        wx.getBLEDeviceServices({
            // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接 
            deviceId: deviceId,
            success: function (res) {
                console.log('device services:', res.services)
                let services = res.services
                for (let index in services) {
                    let service = services[index]

                    if (service.uuid.indexOf(SERVICE_UUID)>-1) {
                        z.getCharacteristicsInfo(deviceId, service.uuid)
                    }
                    else {
                        console.log('not equal')
                        console.log(service.uuid)
                        console.log(ab2hex(SERVICE_UUID))
                    }
                }
            }
        })
    },
    getCharacteristicsInfo: function (deviceId, serviceId) {
        const z = this
        wx.getBLEDeviceCharacteristics({
            // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接
            deviceId: deviceId,
            // 这里的 serviceId 需要在上面的 getBLEDeviceServices 接口中获取
            serviceId: serviceId,
            success: function (res) {
                // console.log('device getBLEDeviceCharacteristics:', res.characteristics)
                let characteristics = res.characteristics
                for(let index in characteristics) {
                    let characteristic = characteristics[index]

                    if(characteristic.uuid.indexOf(CHARACTERISTIC_READ_UUID)) {
                        z.readCharacteristicValue(deviceId, serviceId, characteristic.uuid)

                        wx.notifyBLECharacteristicValueChange({
                            state: true, // 启用 notify 功能
                            // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接  
                            deviceId: deviceId,
                            // 这里的 serviceId 需要在上面的 getBLEDeviceServices 接口中获取
                            serviceId: serviceId,
                            // 这里的 characteristicId 需要在上面的 getBLEDeviceCharacteristics 接口中获取
                            characteristicId: characteristic.uuid,
                            success: function (res) {
                                console.log('notifyBLECharacteristicValueChange success', res.errMsg)
                            }
                        })
                    }
                    else {
                        console.log('char not equal')
                    }
                }
            }
        })
    },
    readCharacteristicValue: function (deviceId, serviceId, characteristicId) {
        wx.readBLECharacteristicValue({
            // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接  [**new**]
            deviceId: deviceId,
            // 这里的 serviceId 需要在上面的 getBLEDeviceServices 接口中获取
            serviceId: serviceId,
            // 这里的 characteristicId 需要在上面的 getBLEDeviceCharacteristics 接口中获取
            characteristicId: characteristicId,
            success: function (res) {
                console.log('readBLECharacteristicValue:', res.errCode)
            }
        })
    }
})