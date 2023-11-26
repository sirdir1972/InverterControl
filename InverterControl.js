// InverterControl.js version 0.90 26.11.2023 evpaddy
var ConfigData = {  
    Power: "0_userdata.0.sumpower.realPower",
    Feedin: 100,
    Chargespeed: 160,
    offset: 10,             // how much difference can we accept
    RunEvery: 4,
    DoSleepFrom: 1,
    DoSleepTo: 7,
    ChargeWhileSleeping: true,
    SwitchFeedin: "shelly.0.SHSW-25#10D0C2#1.Relay0.Switch",
    SwitchCharge: "shelly.0.SHSW-25#10D0C2#1.Relay1.Switch",
    Debug: true,
    InvControlprefix: "0_userdata.0.InvControl",
    pvState: "0_userdata.0.ecoflow.totalPV",
    batInputWatts: "0_userdata.0.ecoflow.app_device_property_.data.InverterHeartbeat.batInputWatts",
    psfeedin: "shelly.0.SHPLG-S#3CE90ED80C11#1.Relay0.Power",
    isChargeSpeedMeasured: true,
    enableExcessCharging: true
    
}

initMyObject(".enableExcessCharging",ConfigData.enableExcessCharging)
initMyObject(".sleeping", false)
initMyObject(".feedingin", false)
initMyObject(".charging", false)
initMyObject(".RunEvery", ConfigData.RunEvery)
initMyObject(".Chargespeed", ConfigData.Chargespeed)
initMyObject(".Feedin", ConfigData.Feedin)
initMyObject(".ChargeWhileSleeping", ConfigData.ChargeWhileSleeping)
initMyObject(".Debug", ConfigData.Debug)
initMyObject(".offset", ConfigData.offset)

const schedstring = '*/' + ConfigData.RunEvery + ' * * * * *' 
schedule(schedstring, function () {
    doSwitch();
});

var battInputWatts = 0
var sleeping = false
var feedingin = false
var charging = false
var doCharge = false
var doFeedin = false
var offset = 0
var Power = 0
var Chargespeed = ConfigData.Chargespeed
var Feedin = ConfigData.Feedin
var enableExcessCharging = false
var excessPower = 0 
var pv =0 
var psfeedin = 0
var batSOC = 0

function doSwitch() {
    sleeping = JSON.parse(getState(ConfigData.InvControlprefix + '.sleeping').val)
    const myDate = new Date();
    const myHour = toInt(myDate.getHours().toString().padStart(2, "0"));
    //const myMinute = myDate.getMinutes().toString().padStart(2, "0");
    //const mySec = myDate.getSeconds().toString().padStart(2, "0");
    const deviceToCharge = ConfigData.SwitchCharge
    const feedinDevice = ConfigData.SwitchFeedin
    const debug = JSON.parse(getState(ConfigData.InvControlprefix + '.Debug').val);
    var chargeWhileSleeping = JSON.parse(getState(ConfigData.InvControlprefix + ".ChargeWhileSleeping").val)
    if (myHour > (toInt(ConfigData.DoSleepFrom)-1) && myHour < (toInt(ConfigData.DoSleepTo))) {    // If sleeping
        if (debug) log ("Sleeping until " + ConfigData.DoSleepTo)
        if (sleeping == false) { // going to sleep now
            sleeping = true
            if (debug) log("Going to sleep")
            if (debug) log("Switching feedin off")
            SwitchDevice(feedinDevice,false)
            sleep (100)
            feedingin = false
            if (chargeWhileSleeping == true) {
                if (debug) log("Switching charging on")
                SwitchDevice(deviceToCharge,true)
            }
        } 
    } else {
        if (sleeping == true) {
            sleeping = false
            if (debug) log("Waking up")
            if (chargeWhileSleeping == true) {
                if (debug) log("Switching charging off")
                SwitchDevice(deviceToCharge,false)
            }
        } 
    }
    if (sleeping == false) {
        if (ConfigData.pvState != "") {
            if (debug) log ('ps vorhanden')
            battInputWatts = toInt((getState(ConfigData.batInputWatts).val)/10)
            pv = toInt(getState(ConfigData.pvState).val)
            psfeedin = toInt(getState(ConfigData.psfeedin).val)
            if (debug) log ("pv: " + pv)
            if (debug) log ("ps feedin:" + psfeedin)

        }
        enableExcessCharging = JSON.parse(getState(ConfigData.InvControlprefix + '.enableExcessCharging').val)
        charging = JSON.parse(getState(deviceToCharge).val)
        feedingin = JSON.parse(getState(feedinDevice).val)
        offset = getState(ConfigData.InvControlprefix + '.offset').val
        Power = toInt(getState(ConfigData.Power).val)
        Feedin = toInt(getState(ConfigData.InvControlprefix + '.Feedin').val)
        if (debug) log ("battInputWatts:" + battInputWatts)
        if (debug) log("feedingin: " + feedingin)
        if (debug) log("charging: " + charging)
        if (debug) log("Chargespeed: " + Chargespeed)
        if (debug) log("Feedin: " + Feedin)
        if (debug) log("Power: " + Power)
        if (debug) log ("enableExchessCharging:" + enableExcessCharging)
        doCharge = false
        doFeedin = false
        if (charging == false && (Power + Chargespeed + offset) < 0) {
            if (debug) log ("charging because there's enough solar")
            doCharge = true
        } else {
            if (charging == true) {
                if (ConfigData.isChargeSpeedMeasured == true && Power < 0 ) {
                    if (debug) log ("charging is on, still some excess")
                    doCharge = true
                } else {
                    if (ConfigData.isChargeSpeedMeasured == false && Power + Chargespeed < 0) {
                        if (debug) log ("Charging is on, not measured, still some excess" )
                        doCharge = true
                    }
                }
            }
        }
        if (ConfigData.pvState != "") { // wenn wir ne PS haben}
            if (battInputWatts > -10 && battInputWatts < 20) { //Kaum Bewegung in der Battiere, also wohl geladen
                if (pv - (Chargespeed + offset) > Power) {
                    doCharge = true
                    if (debug) log ("charging because battery charged and solar excess")
                } else {
                    if (charging == true && pv > Power) { // wir laden schon und trotzdem ist noch überschuss da
                    if (debug) log ("keeping charging on because enough PS solar")
                    doCharge = true
                    }
                }
            }
        }
       

        if (ConfigData.pvState == "") {
            if (Power >= Feedin) { 
                if (debug) log ("feeding in because Power >" + Feedin + offset)
                doFeedin = true
            } else {
                if (ConfigData.isChargeSpeedMeasured == false && feedingin == true  && (Power >= 0)) {
                    if (debug) log ("keeping feedin on because Power >0 ")
                    doFeedin = true
                }
            }
        } 
        if (ConfigData.pvState != "") {                                                // we have a PS
            if (battInputWatts > Feedin + offset && psfeedin > Feedin ) { 
                if (debug) log ("feed in because battery is giving more than " + (Feedin + offset))
                doFeedin = true
            } else {
                if ((psfeedin == 0) && (Power > Feedin + offset)) { // PS ist wahrscheinlich leer}
                    doFeedin = true 
                    if (debug) log ("Feedin because PS isn't doing anything")

                }
            }
        }
        if (ConfigData.pvState != "" && feedingin == true && doFeedin == false) {       
            if (battInputWatts > 0 && psfeedin !=0) {
                if (debug) log ('keeping feedin on because battery is still used') // battery is used and isn't dead
                doFeedin = true
            }
        }            
        if (enableExcessCharging == true) {
            if ( doCharge == true && charging == false ) {
                if (debug) log("switch charge on")
                SwitchDevice(deviceToCharge,true)
                charging = true
                if (doFeedin == true) {
                    log ("charging while feedin is on, this should not happen")
                }
            } else {
                if (doCharge == false && charging == true) {
                    if (debug) log("switch charging off")
                    SwitchDevice(deviceToCharge,false)
                    charging = false
                }
            }
        } else { // we should not charge
            if (JSON.parse(getState(deviceToCharge).val) == true) {
                if (debug) log ("switch off charging")
                setState(deviceToCharge,false)
            } else {
                if (debug) log ("never charging because enableExchessCharging is off")
            }
        }
          
        if (doFeedin == true  && feedingin == false) {
            if (debug) log("Switching on feedin")
            SwitchDevice(feedinDevice,true)
            feedingin = true
            if (doCharge == true) { 
                log (" feeding in and charging at the same time, this should not happen")
            }
        } else { 
            if (doFeedin == false  && feedingin == true) {
                SwitchDevice(feedinDevice,false)
                if (debug) log("Switching off feedin")
                feedingin=false
            }
        }
          
    }
    setState(ConfigData.InvControlprefix + '.sleeping', sleeping)
    setState(ConfigData.InvControlprefix + '.charging', charging)
    setState(ConfigData.InvControlprefix + '.feedingin', feedingin)      
}

function SwitchDevice (device,state) {
    const debug = JSON.parse(getState(ConfigData.InvControlprefix + '.Debug').val);
    if (getState(device).val != state) {
        setState(device,state)
        if (debug) log ("Switched device" + device + 'to ' + state)
    }    
}

function initMyObject(myObject, myValue)
{
    let myvar = ConfigData.InvControlprefix + myObject 
    if(!existsState(myvar)) {
        createState(myvar, myValue)
    } else {
 //               setState(myvar, myValue)
    }
}