import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // change to live URL later
  withCredentials: true, // if using cookies, else can omit
});

export default api;
