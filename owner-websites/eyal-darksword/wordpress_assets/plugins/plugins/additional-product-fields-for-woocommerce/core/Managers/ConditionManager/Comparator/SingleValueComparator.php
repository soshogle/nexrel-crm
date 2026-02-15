<?php


namespace rednaowooextraproduct\core\Managers\ConditionManager\Comparator;


class SingleValueComparator extends ComparatorBase
{

    public function Compare($ComparisonType, $Value)
    {
        $fieldValue=$this->Source->GetValue();
        switch ($ComparisonType)
        {
            case 'Equal':
                return $fieldValue==$Value;
                break;
            case 'NotEqual':
                return $fieldValue!=$Value;
                break;
            case 'IsEmpty':
                return $fieldValue==null||$fieldValue=='';
                break;
            case "IsNotEmpty":
                return $fieldValue!=null&&$fieldValue!='';
                break;

        }
    }
}