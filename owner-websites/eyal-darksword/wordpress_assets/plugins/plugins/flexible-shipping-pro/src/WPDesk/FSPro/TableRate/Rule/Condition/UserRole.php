<?php
/**
 * Class UserRole
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition;

use FSProVendor\WPDesk\Forms\Field;
use FSProVendor\WPDesk\Forms\Field\WooSelect;
use Psr\Log\LoggerInterface;
use WPDesk\FS\TableRate\Rule\Condition\AbstractCondition;
use WPDesk\FS\TableRate\Rule\ShippingContents\ShippingContents;

/**
 * User Role condition.
 */
class UserRole extends AbstractCondition {

	use ConditionOperators;

	const CONDITION_ID = 'user_role';

	const ROLE_GUEST_ID = 'guest';

	/**
	 * TimeOfTheDay constructor.
	 *
	 * @param int $priority .
	 */
	public function __construct( $priority = 10 ) {
		$this->condition_id = self::CONDITION_ID;
		$this->name         = __( 'User Role', 'flexible-shipping-pro' );
		$this->group        = __( 'User', 'flexible-shipping-pro' );
		$this->description  = __( 'Shipping cost based on the selected user role', 'flexible-shipping-pro' );
		$this->priority     = $priority;
	}

	/**
	 * @param array            $condition_settings .
	 * @param ShippingContents $contents           .
	 * @param LoggerInterface  $logger             .
	 *
	 * @return bool
	 */
	public function is_condition_matched( array $condition_settings, ShippingContents $contents, LoggerInterface $logger ) {
		$roles = isset( $condition_settings[ self::CONDITION_ID ] ) ? wp_parse_list( $condition_settings[ self::CONDITION_ID ] ) : [];

		$condition_matched = $this->has_user_roles( $roles );

		$condition_matched = $this->apply_is_not_operator( $condition_matched, $this->get_operator_from_settings( $condition_settings ) );

		$logger->debug( $this->format_for_log( $condition_settings, $condition_matched, [ 'user_roles' => $roles ] ) );

		return $condition_matched;
	}

	/**
	 * @param array $condition_settings .
	 * @param bool  $condition_matched  .
	 * @param array $input_data         .
	 *
	 * @return string
	 */
	protected function format_for_log( array $condition_settings, $condition_matched, $input_data ) {
		// Translators: condition name.
		$formatted_for_log = '   ' . sprintf( __( 'Condition: %1$s;', 'flexible-shipping-pro' ), $this->get_name() );

		// Translators: operator.
		$formatted_for_log .= sprintf( __( ' operator: %1$s;', 'flexible-shipping-pro' ), $this->get_operator_label( $this->get_operator_from_settings( $condition_settings, 'all' ) ) );

		$formatted_for_log .= sprintf( ' %1$s: %2$s;', __( 'user role', 'flexible-shipping-pro' ), implode( ', ', $input_data['user_roles'] ), 'flexible-shipping-pro' ); // phpcs:ignore.

		// Translators: input data.
		$formatted_for_log .= sprintf( __( ' input data: %1$s;', 'flexible-shipping-pro' ), implode( ', ', $this->get_current_user_roles() ), 'flexible-shipping-pro' ); // phpcs:ignore.

		// Translators: matched condition.
		$formatted_for_log .= sprintf( __( ' matched: %1$s', 'flexible-shipping-pro' ), ( $condition_matched ) ? __( 'yes', 'flexible-shipping-pro' ) : __( 'no', 'flexible-shipping-pro' ) );

		return $formatted_for_log;
	}

	/**
	 * @return Field[]
	 */
	public function get_fields() {
		return [
			$this->prepare_operator_is(),
			( new WooSelect() )
				->set_name( self::CONDITION_ID )
				->set_multiple()
				->add_class( 'user_role' )
				->set_options( $this->get_prepared_roles() )
				->set_label( _x( 'one of', 'user role', 'flexible-shipping-pro' ) ),
		];
	}

	/**
	 * @param string[] $roles .
	 *
	 * @return bool
	 */
	private function has_user_roles( $roles ) {
		$user_roles = $this->get_current_user_roles();

		foreach ( $roles as $role ) {
			if ( in_array( $role, $user_roles, true ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * @return string[]
	 */
	private function get_current_user_roles() {
		$user = wp_get_current_user();

		if ( $user && is_user_logged_in() ) {
			return $user->roles;
		}

		return [ self::ROLE_GUEST_ID ];
	}

	/**
	 * @return array<int, string[]>
	 */
	private function get_prepared_roles() {
		$roles = [];

		foreach ( $this->get_roles() as $id => $name ) {
			$roles[] = [
				'value' => $id,
				'label' => $name,
			];
		}

		return $roles;
	}

	/**
	 * @return array<string, string>
	 */
	private function get_roles() {
		$roles = array_map( 'translate_user_role', wp_list_pluck( get_editable_roles(), 'name' ) );

		$roles[ self::ROLE_GUEST_ID ] = __( 'Guest (Not logged in user)', 'flexible-shipping-pro' );

		return $roles;
	}
}
