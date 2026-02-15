<?php
/**
 * ProductTagImportData.
 *
 * @package WPDesk\FS\TableRate\ImportExport
 */

namespace WPDesk\FSPro\TableRate\ImportExport\Conditions;

use WPDesk\FSPro\TableRate\Rule\Condition\ProductTag;

/**
 * Class Hooks
 */
class ProductTagImportData extends ProductTaxonomy {
	/**
	 * @var string
	 */
	protected $taxonomy = 'product_tag';

	/**
	 * @var string
	 */
	protected $condition_id = ProductTag::CONDITION_ID;
}
