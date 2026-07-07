import React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import './CalendarWidget.css';

const CalendarWidget = ({ events }) => {
    const [currentDate, setCurrentDate] = React.useState(new Date());

    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year, month) => {
        return new Date(year, month, 1).getDay();
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    // Identify days with events
    const eventDates = events.map(e => {
        if (!e.date) return null;
        const d = new Date(e.date);
        return {
            year: d.getFullYear(),
            month: d.getMonth(),
            date: d.getDate(),
            name: e.name
        };
    }).filter(Boolean);

    const days = [];
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const hasEvent = eventDates.some(e => e.year === year && e.month === month && e.date === i);
        const eventNames = eventDates.filter(e => e.year === year && e.month === month && e.date === i).map(e => e.name);
        
        days.push(
            <div 
                key={`day-${i}`} 
                className={`calendar-day ${hasEvent ? 'has-event' : ''}`}
                title={hasEvent ? eventNames.join(', ') : ''}
            >
                <span className="calendar-day-number">{i}</span>
                {hasEvent && <div className="calendar-event-dot"></div>}
            </div>
        );
    }

    return (
        <div className="calendar-widget panel">
            <div className="panel-header calendar-header">
                <div>
                    <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CalendarIcon size={18} /> Calendário de Eventos
                    </div>
                </div>
                <div className="calendar-nav">
                    <button onClick={prevMonth} className="btn-icon"><ChevronLeft size={16} /></button>
                    <span className="calendar-month-year">{monthNames[month]} {year}</span>
                    <button onClick={nextMonth} className="btn-icon"><ChevronRight size={16} /></button>
                </div>
            </div>
            <div className="calendar-grid">
                {dayNames.map(day => (
                    <div key={day} className="calendar-day-name">{day}</div>
                ))}
                {days}
            </div>
        </div>
    );
};

export default CalendarWidget;
