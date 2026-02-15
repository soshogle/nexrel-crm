<?php


namespace rednaowooextraproduct\core\Managers\SlateGenerator\Core;


use DOMElement;
use rednaowooextraproduct\core\Managers\FormManager\FormBuilder;

abstract class SlateElementBase
{


    /** @var HtmlTagWrapper */
    public $NodeContainer;
    /** @var SlateElementBase */
    public $Parent;
    /** @var HtmlTagWrapper */
    public $Node;
    /** @var SlateGenerator */
    public $Generator;
    public $SlateObject;



    public function Initialize($parent,$generator,$slateObject){
        $this->Parent=$parent;
        $this->SlateObject=$slateObject;
        $this->Generator=$generator;

    }

    public function GetDataValue($propertyName,$defaultValue)
    {
        if(isset($this->SlateObject->data)&&isset($this->SlateObject)&& isset($this->SlateObject->data->$propertyName))
            return $this->SlateObject->data->$propertyName;

        return $defaultValue;
    }

    public abstract function Process();





    /**
     * @param $elementName
     * @return HtmlTagWrapper
     */
    public function CreateElement($elementName){
        return  $this->Generator->CreateElement($elementName);
    }





}