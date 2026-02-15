<?php

namespace WPDesk\FSPro\TableRate\Rule\Condition\ProductDimension;

/**
 * Can filter shipping contents against product height.
 */
class ProductHeightContentsFilter extends ProductDimensionContentsFilter {

	/**
	 * @param \WC_Product
	 *
	 * @return float
	 */
	protected function get_product_dimension( $product ): float {
		if ( $product->has_dimensions() ) {
			return (float) $product->get_height();
		}

		return 0.0;
	}

}
