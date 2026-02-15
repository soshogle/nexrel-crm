<?php

namespace SW_WAPF\Includes\Models {

    if (!defined('ABSPATH')) {
        die;
    }

    class FieldGroup
    {
        /**
         * @var int the CPT id
         */
        public $id;

        /** @var string "wapf_product". */
        public $type;

        /**
         * @var ConditionRuleGroup[]
         */
        public $rules_groups;

        /**
         * @var Field[]
         */
        public $fields;

        /** @var [] contains the layout settings */
        public $layout;

        public function __construct()
        {
            // Defaults
            $this->type = 'wapf_product';
            $this->rules_groups = [];
            $this->fields = [];

            // Layout defaults
            $this->layout = [
                'labels_position'       => 'above',
                'instructions_position' => 'field',
                'mark_required'         => true
            ];
        }

	    public function to_array() {
		    $a = [
			    'id'            => $this->id,
			    'type'          => $this->type,
			    'layout'        => $this->layout,
			    'fields'        => [],
			    'rule_groups'   => [],
		    ];

		    foreach($this->fields as $f) {
			    $a['fields'][] = $f->to_array();
		    }

		    foreach($this->rules_groups as $rule_group) {
			    $rg = ['rules' => []];
			    foreach($rule_group->rules as $rule) {
				    $r = [
					    'value'     => $rule->value,
					    'condition' => $rule->condition,
					    'subject'   => $rule->subject
				    ];
				    $rg['rules'][] = $r;
			    }
			    $a['rule_groups'][] = $rg;
		    }

		    return $a;
	    }

	    public function from_array($a) {

		    $this->id = $a['id'];
		    $this->type = $a['type'];
		    $this->layout = $a['layout'];

		    foreach($a['rule_groups'] as $rg) {
			    $rulegroup = new ConditionRuleGroup();
			    foreach($rg['rules'] as $r) {
				    $rule = new ConditionRule();
				    $rule->value = $r['value'];
				    $rule->condition = $r['condition'];
				    $rule->subject = $r['subject'];
				    $rulegroup->rules[] = $rule;
			    }
			    $this->rules_groups[] = $rulegroup;
		    }

		    foreach($a['fields'] as $f) {
			    $field = new Field();
			    $this->fields[] = $field->from_array($f);
		    }

		    return $this;
	    }

    }
}