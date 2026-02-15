<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * @subpackage Plugin
 */
class WOOMULTI_CURRENCY_Exim_Import_CSV {
	protected static $settings;
	protected static $instance = null;

	public static function instance() {

		// If the single instance hasn't been set, set it now.
		if ( null == self::$instance ) {
			self::$instance = new self;
		}

		return self::$instance;
	}

	private function __construct() {
		self::$settings = WOOMULTI_CURRENCY_Data::get_ins();
		add_action( 'wp_ajax_wmc_bulk_fixed_price', array( $this, 'import_csv' ) );
	}

	public function import_csv() {
		check_ajax_referer( 'wmc-bulk-fixed-price-nonce', 'security' );
		if ( ! current_user_can( 'edit_products' ) ) {
			wp_die( 'Sorry you are not allowed to do this.' );
		}
		$ext = explode( '.', $_FILES['csv_file']['name'] );
		$pos = sanitize_text_field( $_POST['pos'] );
		$row = sanitize_text_field( $_POST['row'] );
		if ( in_array( $_FILES['csv_file']['type'], array(
				'text/csv',
				'application/vnd.ms-excel'
			) ) && end( $ext ) == 'csv' ) {
			if ( ( $file_data = fopen( $_FILES['csv_file']['tmp_name'], "r" ) ) !== false ) {// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fopen

				$size   = ( $_FILES['csv_file']['size'] );
				$header = fgetcsv( $file_data );

				if ( $pos == 0 ) {
					$pos = ftell( $file_data );
				}

				fseek( $file_data, $pos );

				$currencies = $this->get_active_currencies();
				$roles      = [];

				if ( class_exists( 'WWP_Wholesale_Roles' ) ) {
					$wwpp_wholesale_roles = WWP_Wholesale_Roles::getInstance();
					$roles                = $wwpp_wholesale_roles->getAllRegisteredWholesaleRoles();
					$roles                = array_keys( $roles );
				}

				for ( $i = 0; $i < 30; $i ++ ) {
					$data = fgetcsv( $file_data );

					if ( is_array( $data ) && count( $data ) < 2 ) {
						wp_send_json_error( array( 'message' => esc_html__( 'The file format is not correct, please export template and import again', 'woocommerce-multi-currency' ) ) );
					}

					if ( count( $currencies ) && ! empty( $data ) ) {
						$_regular_price_wmcp = $_sale_price_wmcp = $wholesale_prices = array();
						$id                  = $data[0];
						$src                 = array_combine( $header, $data );

						foreach ( $currencies as $currency ) {
							$regular_price = isset( $src[ $currency ] ) ? $src[ $currency ] : '';
							$sale_price    = isset( $src[ $currency . '-sale' ] ) ? $src[ $currency . '-sale' ] : '';
							if ( floatval( $sale_price ) <= floatval( $regular_price ) ) {
								$_regular_price_wmcp[ $currency ] = $regular_price;
								$_sale_price_wmcp[ $currency ]    = $sale_price;
							} else {
								$_regular_price_wmcp[ $currency ] = '';
								$_sale_price_wmcp[ $currency ]    = '';
							}

							if ( ! empty( $roles ) ) {
								foreach ( $roles as $role ) {
									$wholesale_prices[ $currency ][ $role ] = $src[ $currency . '_' . $role ];
								}
							}
						}
						$line_product = wc_get_product( $id );

						$line_product->update_meta_data('_regular_price_wmcp', wp_json_encode( $_regular_price_wmcp ) );
						$line_product->update_meta_data('_sale_price_wmcp', wp_json_encode( $_sale_price_wmcp ) );

						if ( ! empty( $wholesale_prices ) ) {
							$line_product->update_meta_data('_wholesale_prices_wmcp', wp_json_encode( $wholesale_prices ) );
						}
						$line_product->save_meta_data();

						$row ++;
					}
				}
				$current_pos = ftell( $file_data );
				$percentage  = round( $current_pos / $size * 100 );
				$data        = array(
					'pos'        => $current_pos,
					'percentage' => $percentage,
					'row'        => $row,
					'finish'     => false
				);
				fseek( $file_data, 0, SEEK_END );
				$last_pos = ftell( $file_data );
				if ( $current_pos >= $last_pos ) {
					$data['finish'] = true;
				}
				wp_send_json_success( $data );
			} else {
				wp_send_json_error( array( 'message' => esc_html__( 'Unable to read file', 'woocommerce-multi-currency' ) ) );
			}
		} else {
			wp_send_json_error( array( 'message' => esc_html__( 'File not supported', 'woocommerce-multi-currency' ) ) );
		}
	}

	public function get_active_currencies() {
		return array_values( array_diff( self::$settings->get_currencies(), array( self::$settings->get_default_currency() ) ) );
	}
}
