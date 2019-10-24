import React, {Fragment, useEffect, useState} from "react";
import classNames from 'classnames';
import {
    appointmentEditor,
    dateHeading,
    recurringContainer,
    recurringContainerLeft,
    recurringContainerRight,
    searchFieldsContainer,
    searchFieldsContainerLeft,
    searchFieldsContainerRight,
    timeSelector
} from './AppointmentEditor.module.scss';
import PatientSearch from "../PatientSearch/PatientSearch.jsx";
import ServiceSearch from "../Service/ServiceSearch.jsx";
import ServiceTypeSearch from "../Service/ServiceTypeSearch.jsx";
import ProviderSearch from "../Provider/ProviderSearch.jsx";
import LocationSearch from "../Location/LocationSearch.jsx";
import SpecialitySearch from "../Speciality/SpecialitySearch.jsx";
import ErrorMessage from "../ErrorMessage/ErrorMessage.jsx";
import AppointmentEditorFooter from "../AppointmentEditorFooter/AppointmentEditorFooter.jsx";
import {injectIntl} from "react-intl";
import PropTypes from "prop-types";
import {saveAppointment, saveRecurring} from "./AppointmentEditorService";
import Label from '../Label/Label.jsx';
import {getDateTime, isStartTimeBeforeEndTime} from '../../utils/DateUtil.js'
import DateSelector from "../DateSelector/DateSelector.jsx";
import TimeSelector from "../TimeSelector/TimeSelector.jsx";
import AppointmentNotes from "../AppointmentNotes/AppointmentNotes.jsx";
import RecurringPlan from "../RecurringPlan/RecurringPlan.jsx";
import CustomPopup from "../CustomPopup/CustomPopup.jsx";
import SuccessConfirmation from "../SuccessModal/SuccessModal.jsx";
import {AppContext} from "../AppContext/AppContext";
import AppointmentDatePicker from "../DatePicker/DatePicker.jsx";
import StartDateRadioGroup from "../RadioGroup/StartDateRadioGroup.jsx";
import EndDateRadioGroup from "../RadioGroup/EndDateRadioGroup.jsx";
import RecurrenceTypeRadioGroup from "../RadioGroup/RecurrenceTypeRadioGroup.jsx";
import {minDurationForAppointment} from "../../constants";
import moment from "moment";

const AppointmentEditor = props => {
    const [patient, setPatient] = useState();
    const [patientError, setPatientError] = useState(false);
    const [serviceError, setServiceError] = useState(false);
    const [dateError, setDateError] = useState(false);
    const [startTimeError, setStartTimeError] = useState(false);
    const [endTimeError, setEndTimeError] = useState(false);
    const [recurrencePeriodError, setRecurrencePeriodError] = useState(false);
    const [startTimeBeforeEndTimeError, setStartTimeBeforeEndTimeError] = useState(false);
    const [providers, setProviders] = useState([]);
    const [service, setService] = useState('');
    const [serviceType, setServiceType] = useState('');
    const [location, setLocation] = useState('');
    const [speciality, setSpeciality] = useState('');
    const [startDate, setStartDate] = useState();
    const [endDate, setEndDate] = useState();
    const [startTime, setStartTime] = useState();
    const [endTime, setEndTime] = useState();
    const [isRecurring, setIsRecurring] = useState();
    const {appConfig} = props;
    const [notes, setNotes] = useState();
    const [startDateType, setStartDateType] = useState();
    const [endDateType, setEndDateType] = useState();
    const [recurrenceType, setRecurrenceType] = useState();
    const [occurences, setOccurences] = useState();
    const [period, setPeriod] = useState();
    useEffect(() => {
        if (occurences === undefined)
            setOccurences(getDefaultOccurences)
    });

    const [showSuccessPopup, setShowSuccessPopup] = useState(false);

    const {intl} = props;

    const isSpecialitiesEnabled = () => {
        if (appConfig)
            return appConfig.enableSpecialities;
        return false;
    };

    const getDefaultOccurences = () => {
        if (appConfig && appConfig.recurrence)
            return Number(appConfig.recurrence.defaultNumberOfOccurrences);
    };

    const maxAppointmentProvidersAllowed = () => {
        if (appConfig && appConfig.maxAppointmentProviders)
            return appConfig.maxAppointmentProviders;
        return 1;
    };

    const patientErrorMessage = intl.formatMessage({
        id: 'PATIENT_ERROR_MESSAGE', defaultMessage: 'Please select patient'
    });

    const serviceErrorMessage = intl.formatMessage({
        id: 'SERVICE_ERROR_MESSAGE', defaultMessage: 'Please select service'
    });

    const dateErrorMessage = intl.formatMessage({
        id: 'DATE_ERROR_MESSAGE', defaultMessage: 'Please select date'
    });

    const timeErrorMessage = intl.formatMessage({
        id: 'TIME_ERROR_MESSAGE', defaultMessage: 'Please select time'
    });

    const recurrencePeriodErrorMessage = intl.formatMessage({
        id: 'RECURRENCE_PERIOD_ERROR_MESSAGE', defaultMessage: 'Please select recurrence period'
    });

    const startTimeLessThanEndTimeMessage = intl.formatMessage({
        id: 'START_TIME_LESSTHAN_END_TME_ERROR_MESSAGE', defaultMessage: 'From time should be before to time'
    });

    const getRecurringPattern = () => {
        const recurringPattern = {
            type: recurrenceType,
            period: period
        };
        endDateType === "After" ? recurringPattern.frequency = occurences : recurringPattern.endDate = endDate;
        return recurringPattern;
    };

    const getAppointment = () => {
        let appointment = {
            patientUuid: patient && patient.uuid,
            serviceUuid: service && service.uuid,
            serviceTypeUuid: serviceType && serviceType.uuid,
            startDateTime: getDateTime(startDate, startTime),
            endDateTime: getDateTime(startDate, endTime),
            providers: providers,
            locationUuid: location,
            appointmentKind: "Scheduled",
            comments: notes
        };
        if (!appointment.serviceTypeUuid || appointment.serviceTypeUuid.length < 1)
            delete appointment.serviceTypeUuid;
        return appointment;
    };

    const isValidAppointment = () => {
        const isValidPatient = patient && patient.uuid;
        const startTimeBeforeEndTime = isStartTimeBeforeEndTime(startTime, endTime);
        setPatientError(!isValidPatient);
        setServiceError(!service);
        setDateError(!startDate);
        setStartTimeError(!startTime);
        setEndTimeError(!endTime);
        setStartTimeBeforeEndTimeError(!startTimeBeforeEndTime);
        return isValidPatient && service && startDate && startTime && endTime && startTimeBeforeEndTime;
    };

    const {angularState} = React.useContext(AppContext);

    const isValidRecurringPattern = () => {
      setRecurrencePeriodError(!period);
      return recurrenceType && period && (occurences || endDate);
    };

    const checkAndSave = async () => {
        const appointment = isValidAppointment() && getAppointment();
        const recurringPattern = isRecurring && isValidRecurringPattern() && getRecurringPattern();
        if (appointment && recurringPattern) {
            const recurringRequest = {
                appointmentRequest: appointment,
                recurringPattern: recurringPattern
            };
           return await saveRecurring(recurringRequest);
        }
        else if(appointment) {
            const response = await saveAppointment(appointment);
            if (response.status === 200) {
                angularState.params.viewDate = startDate.startOf('day').toDate();
                setShowSuccessPopup(true);
            }
        }
    };

    const savePopup = <CustomPopup popupContent={<SuccessConfirmation patientDetails={patient && `${patient.name} (${patient.identifier})`}/>} />;

    const appointmentDateProps = {
        translationKey: 'APPOINTMENT_DATE_LABEL', defaultValue: 'Appointment date'
    };

    const appointmentStartTimeProps = {
        translationKey: 'APPOINTMENT_TIME_FROM_LABEL', defaultValue: 'From',
        timeSelectionTranslationKey: 'CHOOSE_TIME_PLACE_HOLDER', timeSelectionDefaultValue: 'Enter time as hh:mm am/pm',
    };

    const appointmentEndTimeProps = {
        translationKey: 'APPOINTMENT_TIME_TO_LABEL', defaultValue: 'To',
        timeSelectionTranslationKey: 'CHOOSE_TIME_PLACE_HOLDER', timeSelectionDefaultValue: 'Enter time as hh:mm am/pm',
    };

    const endTimeBasedOnService = (startTime, service, serviceType) => {
        const currentTime = moment(startTime);
        const duration = getDuration(service, serviceType);
        currentTime.add(duration, 'minutes');
        if (startTime) {
            setEndTime(currentTime);
        }
    };

    const getDuration = (service, serviceType) => (serviceType && serviceType.duration)
                                                    || (service && service.durationMins)
                                                    || minDurationForAppointment;

    return (<Fragment>
        <div data-testid="appointment-editor" className={classNames(appointmentEditor)}>
            <div className={classNames(searchFieldsContainer)}>
                <div className={classNames(searchFieldsContainerLeft)}>
                    <div data-testid="patient-search">
                        <PatientSearch onChange={(optionSelected) => {
                            const newValue = optionSelected ? optionSelected.value : undefined;
                            setPatient(newValue);
                            setPatientError(!newValue);
                        }}/>
                        <ErrorMessage message={patientError ? patientErrorMessage : undefined}/>
                    </div>
                    <div data-testid="service-search">
                        <ServiceSearch onChange={(optionSelected) => {
                            setService(optionSelected.value);
                            setServiceError(!optionSelected.value);
                            endTimeBasedOnService(startTime, optionSelected.value, undefined);

                        }}
                                       specialityUuid={speciality}/>
                        <ErrorMessage message={serviceError ? serviceErrorMessage : undefined}/>
                    </div>
                    <div data-testid="service-type-search">
                        <ServiceTypeSearch onChange={(optionSelected) => {
                            setServiceType(optionSelected.value);
                            endTimeBasedOnService(startTime, undefined, optionSelected.value);
                        }}
                                           serviceUuid={service.uuid}/>
                    </div>
                    {isSpecialitiesEnabled() ?
                        <div data-testid="speciality-search">
                            <SpecialitySearch onChange={(optionSelected) => setSpeciality(optionSelected.value)}/>
                        </div> : null
                    }
                    <div data-testid="location-search">
                        <LocationSearch onChange={(optionSelected) => setLocation(optionSelected.value)}/>
                        <ErrorMessage message={undefined}/>
                    </div>
                </div>
                <div className={classNames(searchFieldsContainerRight)} data-testid="provider-search">
                    <ProviderSearch onChange={selectedProviders => setProviders(selectedProviders)}
                                    maxAppointmentProvidersAllowed={maxAppointmentProvidersAllowed()}/>
                </div>
            </div>
            <div className={classNames(searchFieldsContainer)}>
                <div className={classNames(searchFieldsContainerLeft)}>
                    <RecurringPlan onChange={event => setIsRecurring(event.target.checked)}/>
                </div>
            </div>
            <div className={classNames(recurringContainer)}>
                {isRecurring ?
                    <div className={classNames(recurringContainerLeft)}>
                        <div>
                            <div className={classNames(dateHeading)}>
                                <Label translationKey="STARTS_LABEL" defaultValue="Starts"/>
                            </div>
                            <StartDateRadioGroup
                                onChange={event => {
                                    setStartDateType(event.currentTarget.value);
                                    event.currentTarget.value === "Today" && setStartDate(new Date());
                                }}
                                startDateType={startDateType}/>
                            <AppointmentDatePicker onChange={date => {
                                setStartDate(date);
                                setDateError(!date);
                            }} onClear={() => {
                                setStartDate(undefined);
                            }}/>
                            <ErrorMessage message={dateError ? dateErrorMessage : undefined}/>
                        </div>
                        <div>
                            <div className={classNames(dateHeading)}>
                                <Label translationKey="ENDS_LABEL" defaultValue="Ends"/>
                            </div>
                            <EndDateRadioGroup
                                onChange={event => setEndDateType(event.currentTarget.value)}
                                onOccurencesChange={value => setOccurences(value)}
                                occurences={occurences}
                                endDateType={endDateType}/>
                            <AppointmentDatePicker onChange={date => {
                                setEndDate(date);
                                setDateError(!date);
                            }} onClear={() => {
                                setEndDate(undefined);
                            }} isRecurring={isRecurring} startDate={startDate}/>
                            <ErrorMessage message={dateError ? dateErrorMessage : undefined}/>
                        </div>
                        <div>
                            <div className={classNames(dateHeading)}>
                                <Label translationKey="REPEATS_EVERY_LABEL" defaultValue="Repeats Every"/>
                            </div>
                            <div>
                                <RecurrenceTypeRadioGroup
                                    onChange={event => setRecurrenceType(event.currentTarget.value)}
                                    onPeriodChange={value => setPeriod(value)}
                                    period={period}
                                    recurrenceType={recurrenceType}/>
                                <ErrorMessage message= {recurrencePeriodError ? recurrencePeriodErrorMessage : undefined}/>
                            </div>
                            <div className={classNames(timeSelector)}>
                                <Label translationKey="APPOINTMENT_TIME_LABEL" defaultValue="Choose a time slot"/>
                                <div data-testid="start-time-selector">
                                    <TimeSelector {...appointmentStartTimeProps} defaultTime={startTime}
                                                  onChange={time => {
                                                      setStartTime(time);
                                                      endTimeBasedOnService(time, service, serviceType);
                                                  }}/>
                                    <ErrorMessage message={startTimeError ? timeErrorMessage : undefined}/>
                                </div>
                                <div data-testid="end-time-selector">
                                    <TimeSelector {...appointmentEndTimeProps} defaultTime={endTime}
                                                  onChange={time => {
                                                      setEndTime(time);
                                                      setStartTimeBeforeEndTimeError(!isStartTimeBeforeEndTime(startTime, time));
                                                  }}/>
                                    <ErrorMessage message={endTimeError ? timeErrorMessage : undefined}/>
                                </div>
                                <ErrorMessage
                                    message={startTime && endTime && startTimeBeforeEndTimeError ? startTimeLessThanEndTimeMessage : undefined}/>
                            </div>
                        </div>
                    </div> :
                    <div className={classNames(recurringContainerLeft)}>
                        <div data-testid="date-selector">
                            <DateSelector {...appointmentDateProps} onChange={date => {
                                setStartDate(date);
                                setDateError(!date);
                            }} onClear={() => {
                                setStartDate(undefined);
                            }}/>
                            <ErrorMessage message={dateError ? dateErrorMessage : undefined}/>
                        </div>
                        <div>
                            <Label translationKey="APPOINTMENT_TIME_LABEL" defaultValue="Choose a time slot"/>
                            <div data-testid="start-time-selector">
                                <TimeSelector {...appointmentStartTimeProps} defaultTime={startTime}
                                              onChange={time => {
                                                  setStartTime(time);
                                                  endTimeBasedOnService(time, service, serviceType);
                                              }}/>
                                <ErrorMessage message={startTimeError ? timeErrorMessage : undefined}/>
                            </div>
                            <div data-testid="end-time-selector">
                                <TimeSelector {...appointmentEndTimeProps}
                                              defaultTime={endTime}
                                              onChange={time => {
                                                  setEndTime(time);
                                                  setStartTimeBeforeEndTimeError(!isStartTimeBeforeEndTime(startTime, time));
                                              }}/>
                                <ErrorMessage message={endTimeError ? timeErrorMessage : undefined}/>
                            </div>
                            <ErrorMessage
                                message={startTime && endTime && startTimeBeforeEndTimeError ? startTimeLessThanEndTimeMessage : undefined}/>
                        </div>
                    </div>}
                <div className={classNames(recurringContainerRight)}>
                    <Label translationKey="APPOINTMENT_NOTES" defaultValue="Notes"/>
                    <AppointmentNotes onChange={(event) => setNotes(event.target.value)}/>
                </div>
            </div>
            <AppointmentEditorFooter checkAndSave={checkAndSave}/>
            {showSuccessPopup ? React.cloneElement(savePopup, {open: true, closeOnDocumentClick: false, closeOnEscape: false}) : undefined}
        </div>
    </Fragment>);
};

AppointmentEditor.propTypes = {
    intl: PropTypes.object.isRequired,
    appConfig: PropTypes.object
};

export default injectIntl(AppointmentEditor);
