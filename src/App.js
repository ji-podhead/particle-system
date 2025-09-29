import React from 'react';
import './App.css';
import { useState, useEffect } from 'react'
import { useRef } from 'react';
import ParticlesMain from './particles';

export default function App() {

const mapRef = useRef(null)
  const controlRef = useRef(null);
  return (
    <div className="App ">
        <ParticlesMain></ParticlesMain>
    </div>
  );
}

