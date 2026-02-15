<?php


namespace rednaowooextraproduct\core\Managers\ConditionManager\Comparator;


use rednaowooextraproduct\core\Managers\FormManager\Fields\FBFieldBase;
use rednaowooextraproduct\core\Managers\FormManager\FormBuilder;

class ComparatorFactory
{
    /**
     * @param $model FormBuilder
     * @param $field ComparisonSource
     * @return ComparatorBase
     */
    public static function GetComparator($model,$field)
    {
        switch ($field->Options->Type)
        {
            case 'text':
            case "textarea":
            case 'hidden':
            case 'masked':
                return new SingleValueComparator($model,$field);

            case 'radio':
            case 'checkbox':
            case "dropdown":
            case 'imagepicker':
            case 'buttonselection':
            case 'groupbutton':
                return new MultipleValueComparator($model,$field);
            case 'datepicker':
            case 'slider':
            case 'number':
                return new NumericalValueComparator($model,$field);
            case 'switch':
                return new CheckboxValueComparator($model,$field);
        }

        return new NoneValueComparator($model,$field);
    }

}