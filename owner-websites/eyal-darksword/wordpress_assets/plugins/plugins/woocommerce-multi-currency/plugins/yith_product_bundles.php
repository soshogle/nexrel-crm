<?php

/**
 * Class WOOMULTI_CURRENCY_Plugin_Yith_Product_Bundles
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_Yith_Product_Bundles {
	protected $settings;
	protected $decimal_separator;

	public function __construct() {
//		$this->settings = new WOOMULTI_CURRENCY_Data();
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->get_enable() ) {
			add_action( 'woocommerce_process_product_meta_yith_bundle', array( $this, 'product_price_fields' ) );
		}
	}

	/**
	 * Integrate with Yith Product Bundles
	 * @return bool
	 */
	public function product_price_fields() {
		global $post;
		$currencies    = $this->settings->get_currencies();
		$regular_price = $this->adjust_fixed_price(json_decode( get_post_meta( $post->ID, '_regular_price_wmcp', true ), true ));
		$sale_price    = $this->adjust_fixed_price(json_decode( get_post_meta( $post->ID, '_sale_price_wmcp', true ), true ));
		foreach ( $currencies as $currency ) {
			if ( $currency != $this->settings->get_default_currency() ) {
				?>
				<div style="border-left: 5px solid #f78080;">
					<p class="form-field ">
						<label for="_regular_price_wmcp_<?php esc_attr_e( $currency );// phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralText ?>"><?php echo esc_html__( 'Regular Price', 'woocommerce-multi-currency' ) . ' (' . esc_html( $currency ) . ')'; ?></label>
						<input id="_regular_price_wmcp_<?php esc_attr_e( $currency ); ?>" class="short wc_input_price" type="text" value="<?php ( isset( $regular_price[ $currency ] ) ) ? esc_attr_e( $regular_price[ $currency ] ) : esc_attr_e( '' );// phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralText, WordPress.WP.I18n.NoEmptyStrings ?>" name="_regular_price_wmcp[<?php esc_attr_e( $currency ); ?>]">
					</p>
					<p class="form-field ">
						<label for="_sale_price_wmcp_<?php esc_attr_e( $currency );// phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralText ?>"><?php echo esc_html__( 'Sale Price', 'woocommerce-multi-currency' ) . ' (' . esc_html( $currency ) . ')'; ?></label>
						<input id="_sale_price_wmcp_<?php esc_attr_e( $currency ); ?>" class="short wc_input_price" type="text" value="<?php ( isset( $sale_price[ $currency ] ) ) ? esc_attr_e( $sale_price[ $currency ] ) : esc_attr_e( '' );// phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralText, WordPress.WP.I18n.NoEmptyStrings ?>" name="_sale_price_wmcp[<?php esc_attr_e( $currency ); ?>]">
					</p>
				</div>
				<?php
			}
		}
		wp_nonce_field( 'wmc_save_simple_product_currency', '_wmc_nonce' );
	}
	private function adjust_fixed_price($fixed_price){
		if(!$this->decimal_separator){
			$this->decimal_separator=stripslashes( get_option( 'woocommerce_price_decimal_sep','.' ) );
		}
		if($this->decimal_separator!=='.'&& is_array( $fixed_price ) && count( $fixed_price ) ){
			foreach ( $fixed_price as $key => $value ) {
				$fixed_price[ $key ] = str_replace( '.', $this->decimal_separator, $value );
			}
		}
		return $fixed_price;
	}
}