<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_Yith_Woocommerce_Auctions_Premium {
	protected $settings;

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->get_enable() ) {
			add_filter( 'yith_wcact_auction_product_price', array( $this, 'yith_wcact_auction_product_price' ), 11, 3 );
			add_filter( 'yith_wcact_min_bid_manual', array( $this, 'yith_wcact_min_bid_manual' ), 11, 2 );
			add_filter( 'yith_wcact_max_bid_manual', array( $this, 'yith_wcact_max_bid_manual' ), 11, 2 );
			add_filter( 'yith_wcact_auction_bid', array( $this, 'yith_wcact_auction_bid' ), 11, 2 );
		}
	}

	public function yith_wcact_auction_product_price($max_bid_formatted, $max_bid, $currency) {
		$convert_price = wmc_get_price( $max_bid );

		return wc_price( $convert_price );
	}

	public function yith_wcact_min_bid_manual($minimun_increment_amount, $product) {

		return wmc_get_price( $minimun_increment_amount );
	}

	public function yith_wcact_max_bid_manual($minimun_increment_amount, $product) {

		return wmc_get_price( $minimun_increment_amount );
	}

	public function yith_wcact_auction_bid($bid_amount, $currency) {

		return wmc_revert_price( $bid_amount );
	}

}
