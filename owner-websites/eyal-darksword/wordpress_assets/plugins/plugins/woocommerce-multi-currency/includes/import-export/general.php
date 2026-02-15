<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * @subpackage Plugin
 */
class WOOMULTI_CURRENCY_Exim_General {

	protected static $instance = null;

	public static function instance() {

		// If the single instance hasn't been set, set it now.
		if ( null == self::$instance ) {
			self::$instance = new self;
		}

		return self::$instance;
	}

	private function __construct() {
		add_action( 'admin_menu', array( $this, 'add_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ) );
	}

	public function add_menu() {
		add_submenu_page(
			'woocommerce-multi-currency',
			esc_html__( 'Bulk Fixed Price', 'woocommerce-multi-currency' ),
			esc_html__( 'Bulk Fixed Price', 'woocommerce-multi-currency' ),
			'manage_options',
			'wmc-bulk-fixed-price',
			array( $this, 'menu_page' )
		);
	}

	public function admin_enqueue_scripts() {
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_plugin_nonce' ) ) {
			return;
		}
		global $pagenow;
		$page = isset( $_REQUEST['page'] ) ? sanitize_text_field( $_REQUEST['page'] ) : '';
		if ( $pagenow === 'admin.php' && $page === 'wmc-bulk-fixed-price' ) {
			$src_min = WP_DEBUG ? '' : '.min';
			wp_enqueue_style( 'woocommerce-multi-currency-form', WOOMULTI_CURRENCY_CSS . 'form.min.css', array(), WOOMULTI_CURRENCY_VERSION );
			wp_enqueue_style( 'woocommerce-multi-currency-segment', WOOMULTI_CURRENCY_CSS . 'segment.min.css', array(), WOOMULTI_CURRENCY_VERSION );
			wp_enqueue_style( 'woocommerce-multi-currency-progress', WOOMULTI_CURRENCY_CSS . 'progress.min.css', array(), WOOMULTI_CURRENCY_VERSION );
			wp_enqueue_script( 'woocommerce-multi-currency-progress', WOOMULTI_CURRENCY_JS . 'progress.min.js', array( 'jquery' ), WOOMULTI_CURRENCY_VERSION, false );
			wp_enqueue_style( 'woocommerce-multi-currency-bulk-fixed-price', WOOMULTI_CURRENCY_CSS . 'exim-csv' . $src_min . '.css', array(), WOOMULTI_CURRENCY_VERSION );
			wp_enqueue_script( 'woocommerce-multi-currency-bulk-fixed-price', WOOMULTI_CURRENCY_JS . 'exim-csv' . $src_min . '.js', array( 'jquery' ), WOOMULTI_CURRENCY_VERSION, false );
			$obj = array(
				'ajaxURL'    => admin_url( 'admin-ajax.php' ),
				'exim_nonce' => wp_create_nonce( 'wmc-bulk-fixed-price-nonce' ),
			);
			wp_localize_script( 'woocommerce-multi-currency-bulk-fixed-price', 'wmc_bulk_fixed_price_params', $obj );
		}
	}

	public function menu_page() {
		?>
        <div class="wrap">
            <h2><?php esc_html_e( 'Import/Export Fixed Price', 'woocommerce-multi-currency' ) ?></h2>
            <div class="vi-ui segment">
                <h3><?php esc_html_e( 'Please export CSV file, fill or change fixed regular/sale price of each currency then upload the same file to import', 'woocommerce-multi-currency' ) ?></h3>
                <div class="wmc-bulk-fixed-price-wrap">
                    <div>
                        <h4><?php esc_html_e( 'Step 1: Export CSV', 'woocommerce-multi-currency' ) ?></h4>
                        <button type="button" class="wmc-export-csv button">
							<?php esc_html_e( 'Export', 'woocommerce-multi-currency' ) ?>
                        </button>
                        <div class="vi-ui indicating progress standard small wmc-progress-export">
                            <div class="label"></div>
                            <div class="bar">
                                <div class="progress"></div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <form id="wmc-import-csv" action="" method="post" enctype="multipart/form-data">
                            <h4><?php esc_html_e( 'Step 2: Import CSV', 'woocommerce-multi-currency' ) ?></h4>
                            <input type="file" name="csv_file" class="wmc-csv-file" accept=".csv" required>
                            <button type="button" class="wmc-import-csv button button-primary" name="action"
                                    value="wmc_bulk_fixed_price">
								<?php esc_html_e( 'Import', 'woocommerce-multi-currency' ) ?>
                            </button>
                            <div class="vi-ui indicating progress standard small wmc-progress-import">
                                <div class="label"></div>
                                <div class="bar">
                                    <div class="progress"></div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
		<?php
	}
}
