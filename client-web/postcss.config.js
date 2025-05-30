// client-web/postcss.config.js
module.exports = {
    plugins: [
      require('tailwindcss')('./tailwind.config.js'), // Explicitly load tailwindcss and pass its config
      require('autoprefixer'),
    ],
  };