<?php
/**
 * Class ImportData
 *
 * @package WPDesk\FSPro\TableRate\ImportExport
 */

namespace WPDesk\FSPro\TableRate\ImportExport\Conditions;

use FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable;

/**
 * Can provide import data.
 */
class ImportData implements Hookable {
	/**
	 * Hooks.
	 */
	public function hooks() {
		add_filter( 'flexible-shipping/import/preparing', array( $this, 'add_import_preparing' ) );
	}

	/**
	 * @param \WPDesk\FS\TableRate\ImportExport\Conditions\ImportData[] $prepares .
	 *
	 * @return \WPDesk\FS\TableRate\ImportExport\Conditions\ImportData[]
	 */
	public function add_import_preparing( $prepares ) {
		$product          = new ProductImportData();
		$product_tag      = new ProductTagImportData();
		$shipping_class   = new ShippingClassImportData();
		$product_category = new ProductCategoryImportData();

		$prepares[ $product->get_condition_id() ]          = $product;
		$prepares[ $product_tag->get_condition_id() ]      = $product_tag;
		$prepares[ $shipping_class->get_condition_id() ]   = $shipping_class;
		$prepares[ $product_category->get_condition_id() ] = $product_category;

		return $prepares;
	}
}
