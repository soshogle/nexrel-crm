/* ---
  Docs: https://www.npmjs.com/package/mati-mix/
--- */
const mix = require('mati-mix');

// Activation Reminder Popup
mix.js( [ 'assets-src/popup/js/index.jsx' ], 'assets/js/popup.js' );
mix.sass( 'assets-src/popup/scss/style.scss', 'assets/css/popup.css' );

mix.mix.babelConfig({
	"presets": [
		"@babel/preset-env",
		"@babel/preset-react"
	],
});
