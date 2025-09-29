import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './index.css';
import { Provider } from 'react-redux';
import { wrapStore } from 'redux-in-worker';
import { initialState } from './features/counter/counterSlice';
//import counterSlice from './features/counter/counterSlice';
const container = document.getElementById('root');
const root = createRoot(container);

const store = wrapStore(
  new Worker(new URL('./features/counter/counterSlice', import.meta.url)),
  initialState,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__(),
);


root.render(
  <React.StrictMode>
      <Provider store={store}>
      <App />
      </Provider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
