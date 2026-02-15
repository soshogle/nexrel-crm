<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_DhlExpress {
	public function __construct() {

		if ( ! isset( $_REQUEST['_woo_multi_currency_nonce'] ) || wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_plugin_nonce' ) ) {
			if ( ! empty( $_GET['section'] ) && $_GET['section'] === 'dhlexpress' ) {
				add_action( 'woocommerce_settings_tabs_shipping', [ $this, 'add_currency_field' ] );
			}
		}

		add_action( 'woocommerce_update_options_shipping_dhlexpress', [ $this, 'save_setting' ] );
	}

	public function add_currency_field() {
		$dhl_currency = get_option( 'wmc_dhlexpress_curency' );
		if ( ! $dhl_currency ) {
			$dhl_currency = 'USD';
		}
		?>
        <table class="form-table">
            <tr>
                <th><?php esc_html_e( 'Currency' ); ?></th>
                <td>
                    <input type="text" name="wmc_dhlexpress_curency" value="<?php echo esc_attr( $dhl_currency ) ?>" placeholder="Default: USD">
                </td>
            </tr>
        </table>
		<?php
	}

	public function save_setting() {
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_plugin_nonce' ) ) {
			return;
		}
		if ( ! empty( $_POST['wmc_dhlexpress_curency'] ) ) {
			$dhl_currency = sanitize_text_field( $_POST['wmc_dhlexpress_curency'] );
			update_option( 'wmc_dhlexpress_curency', $dhl_currency );
		}
	}
}

