# InverterControl
Switches 2 relays depending on production/consumption to control charge of a battery and feedin of an inverter

__Variables__:
    **Power**: Object that returns your current powerusage/production
    **Feedin:** How much your inverter will feed in 
    **Chargespeed:** At what speed your battery will charge
    **offset:** How much extra usage/production you need to react
    **RunEvery:** Run script ever x seconds 
    **DoSleepFrom:** 
    **DoSleepTo:** sleep from ... to (don't feed in)
    **ChargeWhileSleeping:** when **true** charge the battery while sleeping
    **SwitchFeedin:** device to switch on when feeding in
    **SwitchCharge:** device to switch on when charging battery
    **Debug:** log debug messages when **true** 
    **InvControlprefix:** where to store objects of this script
    **pvState:** if available, read photovoltaic production of a Powerstream
    **batInputWatts:**: if there's a PS, read what the battery is doing
    **psfeedin:** device that measures what the PS is feeding in
    **isChargeSpeedMeasured:** when **true**, **Power* includes consumption of battery charge
    **enableExcessCharging:** when true, try to charge the battery when there's excess solar energy
    
