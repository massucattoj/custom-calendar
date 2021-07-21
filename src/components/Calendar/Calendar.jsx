import React, { useEffect, useState } from "react";
import axios from "axios";
import moment from "moment";
import "moment/locale/it";

import Button from '@material-ui/core/Button';
import {ArrowBack, ArrowForward, Close, NavigateNext, NavigateBefore} from '@material-ui/icons';
import { FormControl, InputLabel, Select, MenuItem } from "@material-ui/core";

import ScrollMenu from 'react-horizontal-scrolling-menu';

import "./styles.css";


function Calendar() {
    const [resources, setResources] = useState([]) // Save data from api

    const [res, setRes] = useState(""); // Set resource
    const [selectedResource, setSelectedResource] = useState({}) // Set selected resource

    const [currYear, setCurrYear] = useState(moment(new Date()).format('yyyy'))
    const [currMonth, setCurrMonth] = useState(moment(new Date()).format('M'))
    const [unavailableDays, setUnavailableDays] = useState([])
    const [alreadyReserved, setAlreadyReserved] = useState([])

    const [startReservationHour, setStartReservationHour] = useState("")
    const [endReservationHour, setEndReservationHour] = useState("")
    const [counterClick, setCounterClick] = useState(0)


    const [calendar, setCalendar] = useState([]); // Create calendar
    const [value, setValue] = useState(moment()); // Set selected date
    const [availableHours, setAvailableHours] = useState([])

    const weekDays = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']

    // Set calendar limits
    const startDayOfMonth = value.clone().startOf("month").startOf("week");
    const endDayOfMonth = value.clone().endOf("month").startOf("week");

    // Get api data resources, to fill combobox
    useEffect(() => {
        async function getResources() {
            const { data } = await axios.get('https://srv.ueby.dev.flexjump.it/api/booking/loadResources')
            setResources(data)
        }

        getResources()
    }, [])

    useEffect(() => {
        async function getAvailability() {
            const { data } = await axios.get(`https://srv.ueby.dev.flexjump.it/api/booking/monthAvailability?resource_id=${selectedResource.resource_id}&year=${currYear}&month=${currMonth}`)

            // Days with no hours
            const notDays = []
            data.forEach((day) => {
                if (day.available === day.reserved) {
                    notDays.push(moment(day.start_date).format('D'))
                }
            })
            setUnavailableDays(notDays)
        }

        getAvailability()
    }, [selectedResource.resource_id, currYear, currMonth])

    // Create the limits to calendar
    useEffect(() => {
        const day = startDayOfMonth.clone().subtract(1, "day");
        const a = [];

        while (day.isBefore(endDayOfMonth, "day")) {
            a.push(
                Array(7)
                    .fill(0)
                    .map(() => day.add(1, "day").clone())
                );
            }

        setCalendar(a);
    }, [value]);

    function currentMonthName() {
        return value.format("MMMM");
    }

    function currentYear() {
        return value.format("YYYY");
    }

    function prevMonth() {
        setCurrMonth(value.clone().subtract(1, "month").format('M'))
        return value.clone().subtract(1, "month");
    }

    function nextMonth() {
        setCurrMonth(value.clone().add(1, "month").format('M'))
        return value.clone().add(1, "month");
    }

    function thisMonth() {
        return value.isSame(new Date(), "month");
    }

    function isSelected(day) {
        return value.isSame(day, "day");
    }

    function beforeToday(day) {
        return moment(day).isBefore(new Date(), "day");
    }

    function isToday(day) {
        return moment(new Date()).isSame(day, "day");
    }

    function dayStyles(day) {
        if (beforeToday(day)) return "before";
        if (isSelected(day)) return "selected";
        if (isToday(day)) return "today";
        return "";
    }

    function barDayStyles(day) {
        let isAvailable = ""
        unavailableDays.forEach((unDay) => {
            if (unDay !== day.format("D")) {
                isAvailable = "available"
            }
            else {
                isAvailable = "notAvailable"
            }
        })
        return isAvailable
    }

    async function getReservarionsHours(date, min_step) {
        const { data } = await axios.get(`https://srv.ueby.dev.flexjump.it/api/booking/dateReservations?resource_id=${selectedResource.resource_id}&date=${date}`)
        setAlreadyReserved(data)
    }

    async function handleDaySelect(day){
        setStartReservationHour("")
        setEndReservationHour("")

        // If is past day
        if (beforeToday(day)) {
            return null
        }
        else {
            setValue(day)

            // Check current month to see Month Availability (Days if have available hours)
            if (currMonth !== day.format('M')) {
                setCurrMonth(day.format('M'))
            }

            if (currYear !== day.format('yyyy')) {
                setCurrYear(day.format('yyyy'))
            }

            await getReservarionsHours(day.format('yyyyMMDD'), selectedResource.min_step)


            const availableHours = selectedResource.availability[weekDays.indexOf(day.format('ddd')) + 1].hours

            const intervalPeriods = []
            availableHours.forEach((hours) => {
                let i = hours.start
                let intervalos = []
                while(i !== hours.end) {
                    intervalos.push(i)
                    i = moment(i, 'HH:mm:ss').add(selectedResource.min_step, 'minutes').format('HH:mm:ss') // Increase min_step
                }
                intervalos.push(hours.end)
                intervalPeriods.push(intervalos)
            })
            setAvailableHours(intervalPeriods)
        }
    }

    function handleSelectedResource(res_id) {
        const res = resources.filter((res) => res.resource_id === res_id.toString())
        console.log('res:', res[0])
        setSelectedResource(res[0])
        setAvailableHours([])
        setStartReservationHour("")
        setEndReservationHour("")
    }

    async function handlesetResource(event) {
        const res_id = event.target.value
        setRes(res_id);
        handleSelectedResource(res_id)
    }

    function handleIntervalSelectedTime(start, end) {
        if (counterClick === 0) {
            setStartReservationHour(start)
            setEndReservationHour(end)
            setCounterClick(counterClick + 1)
        }

        if (counterClick === 1) {
            if (moment(start, "HH:mm").isSameOrAfter(moment(endReservationHour, "HH:mm"))){
                if (alreadyReserved.length > 0) {
                    alreadyReserved.forEach((already) => {
                        if (moment(start, "HH:mm").isBefore(moment(already.start_time, "HH:mm"))) {
                            setEndReservationHour(end)
                            setCounterClick(counterClick + 1)
                        }
                        else {
                            console.log('Orario gia riservato')
                        }
                    })
                }
                else {
                    setEndReservationHour(end)
                    setCounterClick(counterClick + 1)
                }
            }

            // Se orario selezionato e' uguale a quello gia selezionato
            else if (moment(start, "HH:mm").isSame(moment(startReservationHour, "HH:mm"))) {
                setStartReservationHour("")
                setEndReservationHour("")
                setCounterClick(0)
            }
        }

        if (counterClick === 2) {
            setStartReservationHour("")
            setEndReservationHour("")
            setCounterClick(0)
        }
    }

    function handleReservedHoursStyles(hour) {
        let alreadySet = false
        let control = false
        alreadyReserved.forEach((hr) => {
            // Se ora menor  ou depois de start time E ora igual ou antes end time
            if (moment(hour, 'HH:mm').isSameOrAfter(moment(hr.start_time, 'HH:mm')) && moment(hour, 'HH:mm').isSameOrBefore(moment(hr.end_time, 'HH:mm'))) {
                control = true // hour interval reserved
            } else {
                if (alreadySet) {
                    control = false
                }
            }
        })
        return control
    }

    function handleNextStep() {
        if (startReservationHour === "" || endReservationHour === "") {
            alert('Devi selezionare orario di inizio e fine')
        }
        else {
            console.log('Prossimo step')
            console.log(moment(value).format("yyyy-MM-DD"))
            console.log('start_time: ', startReservationHour)
            console.log('end_time: ', endReservationHour)
        }
    }


  return (
    <div style={{display: 'flex', alignItems: 'center', flexDirection: 'column', marginTop: 50}}>
        
        {/* Selezionare resource */}
        <FormControl required style={{ width: 500 }}>

            <InputLabel>Seleziona </InputLabel>

            <Select value={res} onChange={handlesetResource}>
                {resources.map((resource, index) => (
                    <MenuItem key={index} value={resource.resource_id}>
                        {resource.name}
                    </MenuItem>
                ))}
            </Select>

        </FormControl>

        {res !== "" &&
            <div className="container">
                <div className="calendar-title">
                    <span>Seleziona Data e Ora</span>
                    <Close onClick={() => console.log('Chiudi calendario')}/>
                </div>

                {/* Build from scretch */}
                <div className="calendar">

                    {/* Header */}
                    <div className="header">
                        <div onClick={() => !thisMonth() && setValue(prevMonth())}>
                            {!thisMonth() ? <NavigateBefore /> : <NavigateBefore style={{color: '#bbbdbe'}} />}
                        </div>

                        <div className="current">
                            {/* Month and Year Header */}
                            {currentMonthName()} <span className="year">{currentYear()}</span>
                        </div>

                        <div onClick={() => setValue(nextMonth())}>
                            <NavigateNext />
                        </div>
                    </div>

                    <div className="body">
                        {/* Giorni della settimana */}
                        <div className="week-days">
                            {weekDays.map((weekDay, i) => (
                                <div key={i} className="week">
                                    <span className={(weekDay === 'sab' || weekDay === 'dom') ? 'weekend' : 'normal'}>
                                        {weekDay}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Giorni nel calendario */}
                        {calendar.map((week, index) => (

                            <div key={index}>
                                {week.map((day, idx) => (
                                    <div key={idx} className="day" onClick={() => !beforeToday() && handleDaySelect(day)}>

                                        <div className={dayStyles(day) === 'before' ? "" : 'day-card'}>
                                            <div className={dayStyles(day)}>
                                                {day.format("D").toString()}
                                            </div>


                                            {/* Bar under the day */}
                                            {
                                                (dayStyles(day) === "before" ||  dayStyles(day) === "selected" )
                                                ? ""
                                                : barDayStyles(day) === "notAvailable"  ? <div className="undisponibility"/> : <div className="disponibility"/>
                                            }
                                        </div>

                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Select availability hour */}
                <div className="calendar-info">
                    Clicca per selezionare l'orario per il:
                    <span>
                        {value.format("MMMM")} {value.format("DD")}
                    </span>
                </div>

                {
                    availableHours.map((hours, index, elements) => (
                        <>
                            {/* { moment(hours[0], 'HH:mm').valueOf() < moment('12:00:00', 'HH:mm').valueOf()
                                ? <span className="time-period">Mattina:</span>
                                : <span className="time-period">Notte:</span>
                            } */}

                            <div key={index} className="time-card">
                                <ScrollMenu
                                    alignCenter={false}
                                    arrowLeft={<NavigateBefore />}
                                    arrowRight={<NavigateNext />}
                                    data={hours.map((h, i, e) => (
                                        <div key={i}>
                                            <div style={{display: 'flex', flexDirection: 'row', alignItems: 'baseline'}}>
                                                <div className="time-divider"/>
                                                {
                                                    i < e.length - 1 // To not show the last square hour
                                                        ? handleReservedHoursStyles(e[i])
                                                            ? <div style={{width: 55, height: 35, borderRadius: 4, backgroundColor: "#F08080"}} />
                                                            : (e[i] >= startReservationHour && e[i] < endReservationHour)
                                                                ? <div style={{width: 55, height: 35, borderRadius: 4, backgroundColor: "#4f67e0"}} onClick={() => handleIntervalSelectedTime(e[i], e[i+1])}  />
                                                                : <div style={{width: 55, height: 35, borderRadius: 4, backgroundColor: "#a1df90"}} onClick={() => handleIntervalSelectedTime(e[i], e[i+1])}  />
                                                        : <div />
                                                }
                                            </div>

                                            { i === 0
                                                ? <span style={{fontSize: 12, marginTop: 4, marginBottom: 10, fontWeight: 'bold'}}>{h.slice(0, 5)}</span>
                                                : i === e.length -1
                                                    ? <span style={{fontSize: 12, marginTop: 4, marginBottom: 10, position: 'relative', fontWeight: 'bold', left: -12}}>{h.slice(0, 5)}</span>
                                                    : <span style={{fontSize: 12, marginTop: 4, marginBottom: 10, position: 'relative', left: -12}}>{h.slice(0, 5)}</span>
                                            }

                                        </div>
                                    ))}
                                />
                            </div>
                        </>
                    ))
                }

                <div style={{marginTop: 20}}>
                    <span>Orario di riserva selezionato: {startReservationHour.slice(0,5)} - {endReservationHour.slice(0, 5)}</span>
                </div>

                {/* Footer */}
                <div className="footer">
                    <div>
                        <Button className="btn-prev" onClick={() => console.log('Indietro')}>
                            <ArrowBack />
                            <span>Indietro</span>
                        </Button>
                    </div>
                    <div>
                        <Button variant="contained" className="btn-next" onClick={() => handleNextStep()}>
                            <span>Prossimo step</span>
                            <ArrowForward />
                        </Button>
                    </div>
                </div>

            </div>
        }

    </div>
  );
}

export default Calendar;

