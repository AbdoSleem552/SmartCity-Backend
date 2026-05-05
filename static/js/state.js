/* ═══════════════════════════════════════════════════════════
   state.js — Centralized application state
   ═══════════════════════════════════════════════════════════ */

export const app = document.getElementById('app');

export const state = {
    token:    sessionStorage.getItem('sc_token') || null,
    username: sessionStorage.getItem('sc_user')  || null,
    page:     'home',
    telemetry: {
        gas: 0, light: 0,
        ir1: false, ir2: false,
        led: 'OFF',
        speaker_active: false,
        speaker_volume: 15,
        gas_danger: false,
        gas_threshold: 1000,
        street_light_threshold: 2000,
        city_lights_logic: '',
    },
    illumination: { floor1: false, floor2: false, castle: false, mosque: false, street: false },
    cityTime:  { formatted: '06:00:00', speed: 1 },
    prayerConfig: {
        prayer_times:  { Fajr: '05:00', Dhuhr: '12:30', Asr: '15:45', Maghrib: '18:30', Isha: '20:00' },
        adhan_track:   1,
        adhan_enabled: true,
        track_library: [],
        next_prayer:   null,
    },
    adhanPlaying: null,   // { prayer, time, track } when adhan is active
    socket:    null,
    connected: false,
};
