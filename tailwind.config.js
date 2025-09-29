/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./dist/*.html', "./src/**/*.{html,js}", "./src/Components/myAlgo /**/*.{html,js}"],
  theme: {
    screens: {
      'zero': '100px',
      'xs': '480px',
    },
    extend: {
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1600px',
        'max': '16000000px'
      },
      backgroundImage: {
        '3d-logo': "url(https://super-rain-8442.on.fleek.co/)"
      },
      colors: {
        orange: "#FDE68A",
        darkBlue: "#203647",
        darkestBlue:"#12232E"
      }
      
    },
  },
  plugins: [require('tailwind-scrollbar-hide'),

  require('flowbite/plugin'),

  require('tailwind-scrollbar')
  ],
}