function milesight(bytes) {
    var decoded = {};

    for (var i = 0; i < bytes.length; ) {
        var channel_id = bytes[i++];
        var channel_type = bytes[i++];
        // BATTERY
        if (channel_id === 0x01 && channel_type === 0x75) {
            decoded.battery = bytes[i];
            i += 1;
        }
        // TEMPERATURE
        else if (channel_id === 0x03 && channel_type === 0x67) {
            // ℃
            decoded.temperature = readInt16LE(bytes.slice(i, i + 2)) / 10;
            i += 2;
        }
        // HUMIDITY
        else if (channel_id === 0x04 && channel_type === 0x68) {
            decoded.humidity = bytes[i] / 2;
            i += 1;
        }
        // CO2
        else if (channel_id === 0x07 && channel_type === 0x7d) {
            decoded.co2 = readUInt16LE(bytes.slice(i, i + 2));
            i += 2;
        }
        // HISTORY DATA
        else if (channel_id === 0x20 && channel_type === 0xce) {
            var data = {};
            data.timestamp = readUInt32LE(bytes.slice(i, i + 4));
            data.temperature = readInt16LE(bytes.slice(i + 4, i + 6)) / 10;
            data.humidity = bytes[i + 6] / 2;
            data.co2 = readUInt16LE(bytes.slice(i + 7, i + 9));
            i += 9;

            decoded.history = decoded.history || [];
            decoded.history.push(data);
        } else {
            break;
        }
    }

    return decoded;
}

/* ******************************************
 * bytes to number
 ********************************************/
function readUInt16LE(bytes) {
    var value = (bytes[1] << 8) + bytes[0];
    return value & 0xffff;
}

function readInt16LE(bytes) {
    var ref = readUInt16LE(bytes);
    return ref > 0x7fff ? ref - 0x10000 : ref;
}

function readUInt32LE(bytes) {
    var value = (bytes[3] << 24) + (bytes[2] << 16) + (bytes[1] << 8) + bytes[0];
    return (value & 0xffffffff) >>> 0;
}

function readInt32LE(bytes) {
    var ref = readUInt32LE(bytes);
    return ref > 0x7fffffff ? ref - 0x100000000 : ref;
}

function parseUplink(device, payload) {
    env.log('Data cruda en bytes: ', payload);
    var raw_data = payload.asBytes();
    env.log('Data cruda en bytes: ', raw_data);
    var data = milesight(raw_data);
    env.log('Data parseada: ', data);

    if (data.battery != null) {
        var e = device.endpoints.byAddress("1");
        if (e != null) {
            env.log('Bateria: ', data.battery);
            e.updateGenericSensorStatus(data.battery);
        }
    }
    if (data.temperature != null) {
    var e = device.endpoints.byType(endpointType.temperatureSensor);
        if (e != null) {
            env.log('Temperatura: ', data.temperature);
            e.updateTemperatureSensorStatus(data.temperature);
        }
    }
    if (data.humidity != null) {
        var e = device.endpoints.byType(endpointType.humiditySensor);
        if (e != null) {
            env.log('Humedad: ', data.humidity);
            e.updateHumiditySensorStatus(data.humidity);
        }
    }
    if (data.co2 != null) {
        var e = device.endpoints.byType(
            endpointType.ppmConcentrationSensor,
            ppmConcentrationSensorSubType.carbonDioxide
        );
        if (e != null) {
            env.log('CO2: ', data.co2);
            e.updatePpmConcentrationSensorStatus(data.co2);
        }
    }
}