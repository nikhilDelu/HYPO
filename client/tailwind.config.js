// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      cursor: {
        block:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='16' height='16' fill='black'/%3E%3C/svg%3E\"), auto",
        vintage: 'url("/cursors/vintage.cur"), auto',
      },
    },
  },
};
