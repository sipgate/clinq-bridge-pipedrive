import moment from "moment";

export function formatDuration(ms: number): string {
	const duration = moment.duration(ms);
	const hours = Math.floor(duration.asHours());
	const minutes = Math.floor(Math.max(duration.minutes(), 1));
	const hoursFormatted = hours < 10 ? `0${hours}` : hours;
	const minutesFormatted = minutes < 10 ? `0${minutes}` : minutes;
	return `${hoursFormatted}:${minutesFormatted}`;
}

export function formatDate(time: number) {
	return moment(time)
		.utc()
		.format("YYYY-MM-DD");
}

export function formatTime(time: number) {
	return moment(time)
		.utc()
		.format("HH:mm");
}
