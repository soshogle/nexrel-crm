<?php

namespace WPDesk\FSPro\TableRate\Rule\Condition\ProductDimension;

/**
 * Can filter shipping contents against product width.
 */
class ProductWidthContentsFilter extends ProductDimensionContentsFilter {

	/**
	 * @param \WC_Product
	 *
	 * @return float
	 */
	protected function get_product_dimension( $product ): float {
		if ( $product->has_dimensions() ) {
			return (float) $product->get_width();
		}

		return 0.0;
	}

}
