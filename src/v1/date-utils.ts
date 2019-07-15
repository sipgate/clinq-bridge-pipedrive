import moment from "moment";

export function formatDuration(ms: number): string {
	const duration = moment.duration(ms);
	const hours = Math.floor(duration.asHours());
	const minutes = Math.floor(duration.minutes());
	const minutesFormatted = hours < 10 ? `0${hours}` : hours;
	const secondsFormatted = minutes < 10 ? `0${minutes}` : minutes;
	return `${minutesFormatted}:${secondsFormatted}`;
}

export function formatDate(time: number) {
	const date = new Date(time);
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function formatTime(time: number) {
	return moment(time).format("HH:MM");
}
