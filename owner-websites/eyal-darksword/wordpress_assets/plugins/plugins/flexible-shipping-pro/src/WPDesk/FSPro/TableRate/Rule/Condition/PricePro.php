<?php
/**
 * Class PricePro
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition;

use FSVendor\WPDesk\Forms\Field;
use Psr\Log\LoggerInterface;
use WPDesk\FS\TableRate\Rule\Condition\Price;
use WPDesk\FS\TableRate\Rule\ShippingContents\ShippingContents;

/**
 * Price Pro.
 */
class PricePro extends Price {

	use ConditionOperators;

	/**
	 * PricePro constructor.
	 *
	 * @param int $priority .
	 */
	public function __construct( $priority = 10 ) {
		parent::__construct( $priority );
	}

	/**
	 * @return Field[]
	 */
	public function get_fields() {
		$parent_fields = parent::get_fields();
		$parent_fields[0]->set_label( __( 'from', 'flexible-shipping-pro' ) );

		return array_merge( array( $this->prepare_operator_is() ), $parent_fields );
	}

	/**
	 * @param array            $condition_settings .
	 * @param ShippingContents $contents           .
	 * @param LoggerInterface  $logger             .
	 *
	 * @return bool
	 */
	public function is_condition_matched( array $condition_settings, ShippingContents $contents, LoggerInterface $logger ) {
		$condition_matched = parent::is_condition_matched( $condition_settings, $contents, $logger );

		return $this->apply_is_not_operator( $condition_matched, $this->get_operator_from_settings( $condition_settings ) );
	}
}
