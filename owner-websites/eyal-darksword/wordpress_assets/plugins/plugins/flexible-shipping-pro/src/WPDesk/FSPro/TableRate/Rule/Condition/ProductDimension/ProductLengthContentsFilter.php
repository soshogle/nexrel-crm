<?php

namespace WPDesk\FSPro\TableRate\Rule\Condition\ProductDimension;

/**
 * Can filter shipping contents against product length.
 */
class ProductLengthContentsFilter extends ProductDimensionContentsFilter {

	/**
	 * @param \WC_Product
	 *
	 * @return float
	 */
	protected function get_product_dimension( $product ): float {
		if ( $product->has_dimensions() ) {
			return (float) $product->get_length();
		}

		return 0.0;
	}

}
