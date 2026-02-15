<?php
/**
 * Product Tabs.
 *
 * @package iconic-woothumbs
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Iconic_WooThumbs_Product_Tabs Class.
 */
class Iconic_WooThumbs_Product_Tabs {

	/**
	 * Slug
	 *
	 * @var string
	 */
	public static $slug;

	/**
	 * Run.
	 *
	 * @param string $slug Plugin slug.
	 */
	public static function run( $slug ) {
		self::$slug = $slug;
		add_action( 'plugins_loaded', array( __CLASS__, 'plugins_loaded_hook' ), 100 );
	}

	/**
	 * Execute hooks on plugins loaded.
	 */
	public static function plugins_loaded_hook() {
		add_action( 'woocommerce_product_data_tabs', array( __CLASS__, 'product_tabs' ) );
		add_action( 'woocommerce_product_data_panels', array( __CLASS__, 'product_tab_woothumbs_fields' ) );
		add_action( 'woocommerce_process_product_meta', array( __CLASS__, 'save_product_woothumbs_fields' ) );
		add_action( 'woocommerce_product_data_panels', array( __CLASS__, 'product_tab_attribute_images_fields' ) );
		add_action( 'woocommerce_process_product_meta', array( __CLASS__, 'save_product_attribute_images_fields' ) );
		add_action( 'wp_ajax_admin_get_attribute_terms', array( __CLASS__, 'admin_get_attribute_terms' ) );
		add_action( 'wp_ajax_admin_save_ai_field_data', array( __CLASS__, 'admin_save_ai_field_data' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'admin_enqueue_scripts' ) );
	}

	/**
	 * Admin: Add tabs to product edit page
	 *
	 * @param array $tabs Product tabs.
	 */
	public static function product_tabs( $tabs ) {
		// "Attribute Images" tab.
		$tabs['woothumbs_attribute_images'] = array(
			'label'    => __( 'Attribute Images', 'iconic-woothumbs' ),
			'target'   => self::$slug . '_ai_options',
			'class'    => array( self::$slug . '_ai_options_tab' ),
			'priority' => 51,
		);

		// "WooThumbs" tab.
		$tabs['woothumbs'] = array(
			'label'    => __( 'WooThumbs', 'iconic-woothumbs' ),
			'target'   => self::$slug . '_options',
			'class'    => array( self::$slug . '_options_tab' ),
			'priority' => 71,
		);

		return $tabs;
	}

	/**
	 * Admin: Add custom product fields to the "WooThumbs" tab.
	 */
	public static function product_tab_woothumbs_fields() {
		global $post;
		?>
		<div id="iconic-woothumbs_options" class="panel woocommerce_options_panel">
			<?php
			woocommerce_wp_checkbox(
				array(
					'id'    => 'disable_woothumbs',
					'label' => __( 'Disable WooThumbs?', 'iconic-woothumbs' ),
				)
			);

			woocommerce_wp_text_input(
				array(
					'id'          => 'iconic-woothumbs-video-url',
					'name'        => 'iconic_woothumbs[video_url]',
					'label'       => __( 'Video URL', 'iconic-woothumbs' ),
					'desc_tip'    => true,
					'description' => __( 'Enter a video URL to display in the lightbox only ( a video play icon will be placed over the gallery images ). Most video hosting services are supported.', 'iconic-woothumbs' ),
					'value'       => esc_attr( Iconic_WooThumbs_Product::get_setting( $post->ID, 'video_url' ) ),
				)
			);
			?>
		</div>
		<?php
	}

	/**
	 * Admin: Save custom product fields from the "WooThumbs" tab.
	 *
	 * @param int $post_id WordPress post ID.
	 */
	public static function save_product_woothumbs_fields( $post_id ) {
		global $iconic_woothumbs_class;
		$product_settings = array();

		if ( isset( $_POST['_wpnonce'] ) && ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['_wpnonce'] ) ), 'update-post_' . $post_id ) ) {
			return;
		}

		// Disable WooThumbs.
		$disable_woothumbs = isset( $_POST['disable_woothumbs'] ) ? 'yes' : 'no';
		update_post_meta( $post_id, 'disable_woothumbs', $disable_woothumbs );

		if ( isset( $_POST['iconic_woothumbs'] ) ) {
			if ( isset( $_POST['iconic_woothumbs']['video_url'] ) ) {
				$product_settings['video_url'] = sanitize_text_field( wp_unslash( $_POST['iconic_woothumbs']['video_url'] ) );
			}

			update_post_meta( $post_id, '_iconic_woothumbs', $product_settings );
		}

		$iconic_woothumbs_class->cache_class()::delete_cache_entries( true, $post_id );
	}

	/**
	 * Admin: Add custom product fields
	 */
	public static function product_tab_attribute_images_fields() {
		global $post, $product_object;

		/**
		 * Filter the WooCommerce docs URL.
		 *
		 * @filter woocommerce_docs_url
		 * @since 5.0.0
		 */
		$missing_variations_docs_url = apply_filters( 'woocommerce_docs_url', 'https://docs.woocommerce.com/document/variable-product/', 'product-variations' );
		$variations                  = $product_object->get_children();
		$ai_data                     = get_post_meta( $post->ID, '_iconic_woothumbs_ai', true );
		$ai_data                     = ( $ai_data ) ? $ai_data : array();
		$product_attributes          = $product_object->get_attributes( 'edit' );
		$variations_notice_style     = ( $variations ) ? 'display: none;' : '';
		?>

		<div
		id="iconic-woothumbs_ai_options"
		class="panel iconic-woothumbs-ai woocommerce_options_panel"
		data-ai-data="<?php echo esc_attr( wp_json_encode( $ai_data ) ); ?>"
		>

			<div
			class="inline notice woocommerce-message iconic-woothumbs-ai__missing-variations-notice"
			style="<?php echo esc_attr( $variations_notice_style ); ?>">
				<p>
					<?php
					echo wp_kses(
						__( 'Before you can add additional images to attributes you need to add some variations on the <strong>Variations</strong> tab.', 'woocommerce' ),
						array(
							'strong' => array(),
						)
					);
					?>
				</p>
				<p>
					<a class="button-primary" href="<?php echo esc_url( $missing_variations_docs_url ); ?>" target="_blank">
						<?php esc_html_e( 'Learn more', 'woocommerce' ); ?>
					</a>
				</p>
			</div>

			<div class="iconic-woothumbs-ai__toolbar-top">

				<div class="iconic-woothumbs-ai__header-container">
					<span class="iconic-woothumbs-ai__title"><?php esc_html_e( 'WooThumbs', 'iconic-woothumbs' ); ?></span>
					<span class="iconic-woothumbs-ai__subtitle"><?php esc_html_e( 'Attribute Images', 'iconic-woothumbs' ); ?></span>
				</div>

				<div class="iconic-woothumbs-ai__action-container">

					<select id="iconic-woothumbs-ai-action-select" class="iconic-woothumbs-ai__action-select">
						<option value="" disabled><?php esc_html_e( 'Add attribute images...', 'iconic-woothumbs' ); ?></option>
						<option value="all"><?php esc_html_e( 'For all attributes', 'iconic-woothumbs' ); ?></option>
						<?php
						if ( $product_attributes ) {
							?>
							<optgroup label="<?php esc_attr_e( 'For a specific attribute', 'iconic-woothumbs' ); ?>">
								<?php
								foreach ( $product_attributes as $attribute_name => $attribute_data ) {
									$name  = wc_attribute_label( $attribute_data->get_name() );
									$label = sprintf(
										'%s %s %s',
										esc_html__( 'Add', 'iconic-woothumbs' ),
										$name,
										esc_html__( 'images', 'iconic-woothumbs' )
									);
									echo '<option data-label="' . esc_attr( $name ) . '" value="' . esc_attr( $attribute_name ) . '">' . esc_attr( $label ) . '</option>';
								}
								?>
							</optgroup>
							<?php
						}
						?>
					</select><button disabled id="iconic-woothumbs-ai-action-button" class="button iconic-woothumbs-ai__action-button">
						<?php esc_html_e( 'Add', 'iconic-woothumbs' ); ?>
					</button>

				</div>

				<div id="iconic-woothumbs-ai-search-container" class="iconic-woothumbs-ai__search-container">

					<input
					type="text"
					name="iconic-woothumbs-ai__search-field"
					class="iconic-woothumbs-ai__search-field"
					placeholder="<?php echo esc_attr__( 'Filter attribute terms...', 'iconic-woothumbs' ); ?>"
					/>

				</div>

			</div>

			<div class="clear"></div>

			<div
			class="inline notice woocommerce-message iconic-woothumbs-ai__default-state-notice"
			style="<?php echo esc_attr( $variations_notice_style ); ?>">
				<p>
					<?php
					echo esc_html__( 'Select an attribute using the dropdown above to start adding images.', 'iconic-woothumbs' )
					?>
				</p>
			</div>

			<div class="iconic-woothumbs-ai__inner">

				<div id="iconic-woothumbs-ai__section--specific" class="iconic-woothumbs-ai__section iconic-woothumbs-ai__section--specific"></div>

				<div id="iconic-woothumbs-ai__section--all" class="iconic-woothumbs-ai__section iconic-woothumbs-ai__section--all"></div>

				<div class="clear"></div>

				<div id="iconic-woothumbs-ai-toolbar-changes" class="iconic-woothumbs-ai__toolbar-changes">

					<button
					id="save-attribute-images"
					type="button"
					class="button-primary save-attribute-images"
					disabled="disabled"
					>
						<?php esc_html_e( 'Save changes', 'iconic-woothumbs' ); ?>
					</button>

					<button
					id="cancel-attribute-images"
					type="button"
					class="button cancel-attribute-images"
					disabled="disabled"
					>
						<?php esc_html_e( 'Cancel', 'iconic-woothumbs' ); ?>
					</button>

					<div class="iconic-woothumbs-ai__pagenav" style="display: none">

						<span class="iconic-woothumbs-ai__expand-close">
							(<a href="#" class="expand">
								<?php esc_html_e( 'Expand All', 'iconic-woothumbs' ); ?>
							</a> / <a href="#" class="close">
								<?php esc_html_e( 'Close All', 'iconic-woothumbs' ); ?>
							</a>)
						</span>

					</div>

					<div class="clear"></div>

				</div>

			</div>

		</div>
		<?php
	}

	/**
	 * Admin: Clear cache entries when products are saved.
	 *
	 * @param int $post_id WordPress post ID.
	 */
	public static function save_product_attribute_images_fields( $post_id ) {
		global $iconic_woothumbs_class;
		$iconic_woothumbs_class->cache_class()::delete_cache_entries( true, $post_id );
	}

	/**
	 * Admin: Get attribute terms to populate an attribute images row.
	 */
	public static function admin_get_attribute_terms() {
		global $iconic_woothumbs_class;

		if (
			! isset( $_REQUEST['nonce'] ) ||
			! wp_verify_nonce( sanitize_text_field( wp_unslash( $_REQUEST['nonce'] ) ), $iconic_woothumbs_class->ajax_nonce_string )
		) {
			wp_send_json_error( array( 'msg' => 'Invalid Nonce' ) );
		}

		if ( empty( $_REQUEST['product_id'] ) ) {
			wp_send_json_error( array( 'msg' => 'No product ID supplied' ) );
		}

		if ( empty( $_REQUEST['attribute_name'] ) ) {
			wp_send_json_error( array( 'msg' => 'No attribute ID supplied' ) );
		}

		$product_id     = sanitize_text_field( wp_unslash( $_REQUEST['product_id'] ) );
		$product        = wc_get_product( (int) $product_id );
		$attribute_name = urldecode( wp_strip_all_tags( wp_unslash( $_REQUEST['attribute_name'] ) ) );
		$default_terms  = array( 'Any' );

		// Either get global attribute terms, or custom
		// product attribute terms.
		if ( false !== strpos( $attribute_name, 'pa_' ) ) {
			global $sitepress;

			// WPML compatibility: Switch to the site default language.
			if ( is_object( $sitepress ) && method_exists( $sitepress, 'switch_lang' ) ) {
				$sitepress->switch_lang( $sitepress->get_default_language() );
			}

			$terms = wc_get_product_terms(
				$product_id,
				$attribute_name,
				array(
					'fields' => 'id=>name',
				)
			);

			// WPML compatibility: Switch back to the current language.
			if ( is_object( $sitepress ) && method_exists( $sitepress, 'switch_lang' ) ) {
				$sitepress->switch_lang( $sitepress->get_current_language() );
			}
		} else {
			$attribute_data_raw = $product->get_attribute( $attribute_name );
			$attribute_data     = explode( ' | ', $attribute_data_raw );
			$terms              = ( $attribute_data ) ? $attribute_data : array();
		}

		if ( ! $terms || is_wp_error( $terms ) ) {
			wp_send_json_error( array( 'msg' => 'Failed to retrieve terms as the supplied attribute does not exist or has no terms assigned.' ) );
		}

		$encoded_data = wp_json_encode( array_values( array_merge( $default_terms, $terms ) ) );

		if ( $encoded_data ) {
			wp_send_json_success( $encoded_data );
		} else {
			wp_send_json_error();
		}
	}

	/**
	 * Admin: Save attribute images field data as post meta.
	 */
	public static function admin_save_ai_field_data() {
		global $iconic_woothumbs_class;

		if (
			! isset( $_REQUEST['nonce'] ) ||
			! wp_verify_nonce( sanitize_text_field( wp_unslash( $_REQUEST['nonce'] ) ), $iconic_woothumbs_class->ajax_nonce_string )
		) {
			wp_send_json_error( array( 'msg' => 'Invalid Nonce!' ) );
		}

		if ( empty( $_REQUEST['product_id'] ) ) {
			wp_send_json_error( array( 'msg' => 'No product ID supplied!' ) );
		}

		$product_id = sanitize_text_field( wp_unslash( $_REQUEST['product_id'] ) );
		$field_data = ! empty( $_REQUEST['data'] ) ? filter_input( INPUT_POST, 'data', FILTER_DEFAULT, FILTER_REQUIRE_ARRAY ) : array();

		update_post_meta( intval( $product_id ), '_iconic_woothumbs_ai', $field_data );

		wp_send_json_success();
	}

	/**
	 * Admin: Enqueue scripts on the product edit screen.
	 */
	public static function admin_enqueue_scripts() {
		$screen = get_current_screen();

		if ( 'post' !== $screen->base && 'product' !== $screen->post_type ) {
			return;
		}

		wp_enqueue_script( 'selectWoo' );
		wp_enqueue_style( 'select2' );
	}

	/**
	 * Suppress WPML translation of query results.
	 */
	public static function suppress_wpml_query_translation( $details, $element_id, $element_type ) {
		$details['language_code'] = apply_filters( 'wpml_default_language', null );
		return $details;
	}
}
