<?php


namespace rednaowooextraproduct\core\Managers\ConditionManager\Comparator;


class MultipleValueComparator extends ComparatorBase
{

    public function Compare($ComparisonType, $Value)
    {
        if($Value==null)
            $Value=array();

        if(!\is_array($Value))
            $Value=[$Value];


        $selectedValues=$this->Source->GetValue();

        if(is_array($selectedValues)&&count($selectedValues)>0&&isset($selectedValues[0]->Id))
            $selectedValues=\array_map(function ($x){return $x->Id;},$selectedValues);
        if(!\is_array($selectedValues))
            $selectedValues=[$selectedValues];
        switch ($ComparisonType)
        {
            case 'Contains':
                return !count(\array_intersect($Value,$selectedValues))==0;
                break;
            case "NotContains":
                return count(\array_intersect($Value,$selectedValues))==0;
                break;
            case "IsEmpty":
                return count($Value)==0;
                break;
            case "IsNotEmpty":
                return count($Value)>0;
                break;
        }

    }
}