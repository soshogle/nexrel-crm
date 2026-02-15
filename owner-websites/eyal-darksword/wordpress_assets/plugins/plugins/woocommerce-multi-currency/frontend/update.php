<?php

/**
 * Class WOOMULTI_CURRENCY_Frontend_Update
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Frontend_Update {
	protected $settings;

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->get_enable() ) {
			add_action( 'init', array( $this, 'update_exchange_rate' ) );
		}
	}

	/**
	 * Fix Round
	 *
	 * @param $cart
	 */
	public function update_exchange_rate() {
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_frontend_nonce' ) ) {
			return;
		}
		if ( isset( $_GET['swift-no-cache'] ) ) {
			return;
		}

		$update = $this->settings->get_update_exchange_rate();
		if ( ! $update ) {
			return;
		}
		$check_data = get_transient( 'wmc_update_exchange_rate' );
		if ( $check_data ) {
			return;
		}

		switch ( $update ) {
			case 12;
				$time = 300;
				break;
			case 1;
				$time = 1800;
				break;
			case 2;
				$time = 3600;
				break;
			case 3;
				$time = 3600 * 6;
				break;
			case 4;
				$time = 3600 * 24;
				break;
			case 7;
				$time = 3600 * 24 * 2;
				break;
			case 8;
				$time = 3600 * 24 * 3;
				break;
			case 9;
				$time = 3600 * 24 * 4;
				break;
			case 10;
				$time = 3600 * 24 * 5;
				break;
			case 11;
				$time = 3600 * 24 * 6;
				break;
			case 5;
				$time = 3600 * 24 * 7;
				break;
			default:
				$time = 3600 * 24 * 30;
				break;
		}
		$list_currencies = $this->settings->get_currencies();
		$settings        = get_option( 'woo_multi_currency_params', array() );

		if ( count( $settings ) ) {
			$rates = $this->settings->get_exchange( $this->settings->get_default_currency(), implode( ',', $list_currencies ) );
			set_transient( 'wmc_update_exchange_rate', 1, $time );
			if ( count( $rates ) == count( $list_currencies ) ) {
				$new_rates = array();
				foreach ( $list_currencies as $currency ) {
					$new_rates[] = isset( $rates[ $currency ] ) ? $rates[ $currency ] : 1;
				}
				$settings['currency_rate'] = apply_filters( 'wmc_update_exchange_rate_new_rates', array_values( $new_rates ), $settings );
				update_option( 'woo_multi_currency_params', $settings );
				$this->send_email( $settings );
			}
		}

	}

	/**
	 * Send notification
	 */
	private function send_email( $content ) {

		if ( $this->settings->check_send_email() ) {
			$admin_email = $this->settings->get_email_custom();
			if ( ! $admin_email ) {
				$admin_email = get_option( 'admin_email' );
			}
			$list_currencies = $this->settings->get_currencies();
			$currency_rates  = $content['currency_rate'];
			ob_start(); ?>
            <table cellpadding="2" cellspacing="3">
                <tr>
                    <th><?php echo esc_html__( 'Currency', 'woocommerce-multi-currency' ) ?></th>
                    <th><?php echo esc_html__( 'Rate', 'woocommerce-multi-currency' ) ?></th>
                </tr>
				<?php if ( count( $list_currencies ) ) {
					foreach ( $list_currencies as $k => $currency ) {
						?>
                        <tr>
                            <td><?php echo esc_html( $currency ) ?></td>
                            <td><?php echo esc_html( $currency_rates[ $k ] ) ?></td>
                        </tr>
					<?php }
				} ?>
            </table>
			<?php
			$content = ob_get_clean();

			if ( $admin_email ) {
				$headers = array( 'Content-Type: text/html; charset=UTF-8' );
				wp_mail( $admin_email, esc_html__( 'Exchange rate is updated', 'woocommerce-multi-currency' ), esc_html__( 'You can check at ', 'woocommerce-multi-currency' ) . get_option( 'siteurl' ) . '<br/>' . $content, $headers );
			}
		}
	}

}