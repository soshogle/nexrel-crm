<?php
/**
 * Class ExportData
 *
 * @package WPDesk\FSPro\TableRate\ImportExport
 */

namespace WPDesk\FSPro\TableRate\ImportExport\Conditions;

use FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable;

/**
 * Can provide export data.
 */
class ExportData implements Hookable {
	/**
	 * Hooks.
	 */
	public function hooks() {
		add_filter( 'flexible-shipping/export/preparing', array( $this, 'add_export_preparing' ) );
	}

	/**
	 * @param \WPDesk\FS\TableRate\ImportExport\Conditions\ExportData[] array $prepares .
	 *
	 * @return \WPDesk\FS\TableRate\ImportExport\Conditions\ExportData[]
	 */
	public function add_export_preparing( $prepares ) {
		$product_tag      = new ProductTagExportData();
		$shipping_class   = new ShippingClassExportData();
		$product_category = new ProductCategoryExportData();

		$prepares[ $product_tag->get_condition_id() ]      = $product_tag;
		$prepares[ $shipping_class->get_condition_id() ]   = $shipping_class;
		$prepares[ $product_category->get_condition_id() ] = $product_category;

		return $prepares;
	}
}
