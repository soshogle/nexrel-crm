<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * @subpackage Plugin
 */
class WOOMULTI_CURRENCY_Exim_Export_CSV {
	protected static $settings;
	protected static $instance = null;

	public static function instance() {

		// If the single instance hasn't been set, set it now.
		if ( null == self::$instance ) {
			self::$instance = new self;
		}

		return self::$instance;
	}

	protected $page = 1;

	protected $limit = 10;

	protected $filename = 'wmc-export.csv';

	protected $total_rows = 0;

	protected $exported_row_count = 0;

	protected $row_data = array();

	private function __construct() {
		self::$settings = WOOMULTI_CURRENCY_Data::get_ins();
		add_action( 'wp_ajax_wmc_bulk_fixed_price_export', array( $this, 'export_csv' ) );
		add_action( 'admin_init', array( $this, 'download_export_file' ) );
	}

	public function export_csv() {
		check_ajax_referer( 'wmc-bulk-fixed-price-nonce', 'security' );

		if ( ! current_user_can( 'edit_products' ) ) {
			wp_die( 'Sorry you are not allowed to do this.' );
		}

		$step = isset( $_POST['step'] ) ? sanitize_text_field( $_POST['step'] ) : 1;
		if ( isset( $_POST['filename'] ) ) {
			$this->set_filename( $_POST['filename'] );
		}
		$this->set_page( $step );

		$this->generate_file();

		$query_args = array(
			'nonce'    => wp_create_nonce( 'wmc-product-csv' ),
			'action'   => 'wmc_product_csv',
			'filename' => $this->get_filename(),
		);

		if ( 100 === $this->get_percent_complete() ) {
			wp_send_json_success(
				array(
					'step'       => 'done',
					'percentage' => 100,
					'url'        => add_query_arg( $query_args, admin_url( 'admin.php?page=wmc-bulk-fixed-price' ) ),
				)
			);
		} else {
			wp_send_json_success(
				array(
					'step'       => ++ $step,
					'percentage' => $this->get_percent_complete(),
				)
			);
		}

		wp_die();
	}

	public function set_page( $page ) {
		$this->page = $page;
	}

	public function get_page() {
		return intval( $this->page );
	}

	public function generate_file() {
		if ( 1 === $this->get_page() ) { //if step = 1 => delete file
			wp_delete_file( $this->get_file_path() ); // phpcs:ignore WordPress.VIP.FileSystemWritesDisallow.file_ops_unlink, Generic.PHP.NoSilencedErrors.Discouraged,
		}
		$this->prepare_data_to_export();
		$this->write_csv_data( $this->get_csv_data() );
	}

	protected function get_file_path() {
		$upload_dir = wp_upload_dir();

		return trailingslashit( $upload_dir['basedir'] ) . $this->get_filename();
	}

	public function set_filename( $filename ) {
		$this->filename = sanitize_file_name( str_replace( '.csv', '', $filename ) . '.csv' );
	}

	public function get_filename() {
		return $this->filename;
	}

	public function get_limit() {
		return $this->limit;
	}

	public function get_file() {
		$file = '';
		if ( @file_exists( $this->get_file_path() ) ) { // phpcs:ignore Generic.PHP.NoSilencedErrors.Discouraged
			$file = @file_get_contents( $this->get_file_path() ); // phpcs:ignore Generic.PHP.NoSilencedErrors.Discouraged, WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents, WordPress.WP.AlternativeFunctions.file_system_read_file_get_contents
		} else {
			@file_put_contents( $this->get_file_path(), '' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_chmod, Generic.PHP.NoSilencedErrors.Discouraged, WordPress.WP.AlternativeFunctions.file_system_read_file_put_contents, WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			@chmod( $this->get_file_path(), 0664 ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_chmod, WordPress.WP.AlternativeFunctions.file_system_read_file_put_contents, Generic.PHP.NoSilencedErrors.Discouraged
		}

		return $file;
	}

	public function get_active_currencies() {
		return array_values( array_diff( self::$settings->get_currencies(), array( self::$settings->get_default_currency() ) ) );
	}

	public function prepare_data_to_export() {
		$args = array(
			'status'   => array(
				'private',
				'publish',
				'draft',
				'future',
				'pending'
			),
			'type'     => array_merge( apply_filters( 'wmc_simple_product_type_register', array(
				'simple',
				'external',
				'bundle',
				'course',
				'subscription',
				'woosb',
				'composite',
				'appointment',
				'tour',
			) ), array(
				'grouped',
				'variable'
			) ),
			'limit'    => $this->get_limit(),
			'page'     => $this->get_page(),
			'orderby'  => array(
				'ID' => 'ASC',
			),
			'return'   => 'objects',
			'paginate' => true,
		);

		$products = wc_get_products( $args );

		$this->total_rows = $products->total;
		$this->row_data   = array();

		$active_currencies = $this->get_active_currencies();
		foreach ( $products->products as $key => $product ) {
			++ $this->exported_row_count;
			$this->handle_currency_arr( $product, $active_currencies );
			if ( $product->is_type( 'variable' ) ) {
				$variable_products = wc_get_products(
					array(
						'parent' => $product->get_id(),
						'type'   => array( 'variation' ),
						'return' => 'objects',
						'limit'  => - 1,
					)
				);
				foreach ( $variable_products as $variable_product ) {
					$this->handle_currency_arr( $variable_product, $active_currencies );
				}
			}
		}
	}

	/**
	 * @param $product WC_Product
	 * @param $active_currencies
	 */
	public function handle_currency_arr( $product, $active_currencies ) {
		$pid              = $product->get_id();
		$regular_price    = json_decode( $product->get_meta('_regular_price_wmcp', true ), true );
		$sale_price       = json_decode( $product->get_meta('_sale_price_wmcp', true ), true );
		$wholesale_prices = json_decode( $product->get_meta('_wholesale_prices_wmcp', true ), true );
		$roles            = [];

		if ( class_exists( 'WWP_Wholesale_Roles' ) ) {
			$wwpp_wholesale_roles = WWP_Wholesale_Roles::getInstance();
			$roles                = $wwpp_wholesale_roles->getAllRegisteredWholesaleRoles();
			$roles                = array_keys( $roles );
		}

		$data = array();

		foreach ( $active_currencies as $currency ) {
			$data[ $currency ]           = isset( $regular_price[ $currency ] ) ? $regular_price[ $currency ] : '';
			$data[ $currency . '-sale' ] = isset( $sale_price[ $currency ] ) ? $sale_price[ $currency ] : '';

			if ( ! empty( $roles ) && is_array( $roles ) ) {
				foreach ( $roles as $role ) {
					$data[ $currency . '_' . $role ] = $wholesale_prices[ $currency ][ $role ] ?? '';
				}
			}
		}

		$type             = $product->get_type();
		$this->row_data[] = wp_parse_args( $data, array(
			'id'            => $pid,
			'name'          => $product->get_name(),
			'type'          => $type,
			'sku'           => $product->get_sku(),
			'attribute'     => $type === 'variation' ? implode( '-', $product->get_attributes() ) : '',
			'regular_price' => $product->get_regular_price( 'edit' ),
			'sale_price'    => $product->get_sale_price( 'edit' ),
		) );
	}

	public function get_csv_data() {
		$data   = $this->row_data; //full data array
		$buffer = fopen( 'php://output', 'w' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_read_fopen
		ob_start();

		array_walk( $data, array( $this, 'export_row' ), $buffer );

		return ob_get_clean();
	}

	protected function export_row( $row_data, $key, $buffer ) {
		fputcsv( $buffer, $row_data, ",", '"', "\0" );
	}

	protected function write_csv_data( $data ) {
		$file = $this->get_file();

		if ( 100 === $this->get_percent_complete() ) {
			$file = chr( 239 ) . chr( 187 ) . chr( 191 ) . $this->export_column_headers() . $file;
		}

		$file .= $data;
		@file_put_contents( $this->get_file_path(), $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents, WordPress.WP.AlternativeFunctions.file_system_read_file_put_contents
		//write to file
	}

	protected function export_column_headers() {
		$currencies       = $this->get_active_currencies();
		$default_currency = self::$settings->get_default_currency();
		$fix_col          = array(
			'ID',
			'Product',
			'Type',
			'SKU',
			'Variation Attributes',
			"{$default_currency}(view only)",
			"{$default_currency}-sale(view only)",
		);

		$export_row = array();
		$roles      = [];

		if ( class_exists( 'WWP_Wholesale_Roles' ) ) {
			$wwpp_wholesale_roles = WWP_Wholesale_Roles::getInstance();
			$roles                = $wwpp_wholesale_roles->getAllRegisteredWholesaleRoles();
			$roles                = array_keys( $roles );
		}

		foreach ( $currencies as $currency ) {
			$export_row[] = $currency;
			$export_row[] = $currency . '-sale';
			if ( ! empty( $roles ) && is_array( $roles ) ) {
				foreach ( $roles as $role ) {
					$export_row[] = $currency . '_' . $role;
				}
			}
		}

		$export_row = wp_parse_args( $export_row, $fix_col );

		$buffer = fopen( 'php://output', 'w' );

		ob_start();

		fputcsv( $buffer, $export_row, ",", '"', "\0" );

		return ob_get_clean();
	}

	public function get_total_exported() {
		return ( ( $this->get_page() - 1 ) * $this->get_limit() ) + $this->exported_row_count;
	}

	public function get_percent_complete() {

		return $this->total_rows ? floor( ( $this->get_total_exported() / $this->total_rows ) * 100 ) : 100;
	}

	public function download_export_file() {
		if ( isset( $_GET['action'], $_GET['nonce'] ) && wp_verify_nonce( wp_unslash( $_GET['nonce'] ), 'wmc-product-csv' ) && 'wmc_product_csv' === wp_unslash( $_GET['action'] ) ) { // WPCS: input var ok, sanitization ok.

			if ( ! empty( $_GET['filename'] ) ) { // WPCS: input var ok.
				$this->set_filename( wp_unslash( $_GET['filename'] ) ); // WPCS: input var ok, sanitization ok.
			}

			$this->export();
		}
	}

	public function export() {
		$this->send_headers();
		$this->send_content( $this->get_file() );
		wp_delete_file( $this->get_file_path() ); // phpcs:ignore WordPress.VIP.FileSystemWritesDisallow.file_ops_unlink, Generic.PHP.NoSilencedErrors.Discouraged
		die();
	}

	public function send_content( $csv_data ) {
		echo $csv_data; // @codingStandardsIgnoreLine
	}

	public function send_headers() {
		if ( function_exists( 'gc_enable' ) ) {
			gc_enable(); // phpcs:ignore PHPCompatibility.FunctionUse.NewFunctions.gc_enableFound
		}
		if ( function_exists( 'apache_setenv' ) ) {
			@apache_setenv( 'no-gzip', 1 ); // @codingStandardsIgnoreLine
		}
		@ini_set( 'zlib.output_compression', 'Off' ); // @codingStandardsIgnoreLine
		@ini_set( 'output_buffering', 'Off' ); // @codingStandardsIgnoreLine
		@ini_set( 'output_handler', '' ); // @codingStandardsIgnoreLine
		ignore_user_abort( true );
		wc_set_time_limit( 0 );
		wc_nocache_headers();
		header( 'Content-Type: text/csv; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename=' . $this->get_filename() );
		header( 'Pragma: no-cache' );
		header( 'Expires: 0' );
	}
}
