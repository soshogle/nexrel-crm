/* ---
 Docs: https://www.npmjs.com/package/mati-mix/
 --- */
const mix = require( 'mati-mix' );

// Settings
mix.js('assets/src/js/shipping-extensions.js', 'assets/dist/js/shipping-extensions.js');
mix.sass('assets/src/scss/shipping-extensions.scss', 'assets/dist/css/shipping-extensions.css');

mix.mix.webpackConfig(
	{
		externals: {
			"@wordpress/i18n": [ "wp", "i18n" ]
		}
	}
);
