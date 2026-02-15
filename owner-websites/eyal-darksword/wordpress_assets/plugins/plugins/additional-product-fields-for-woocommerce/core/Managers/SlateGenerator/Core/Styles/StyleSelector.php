<?php


namespace rednaowooextraproduct\core\Managers\SlateGenerator\Core\Styles;



use DOMElement;

class StyleSelector{
    const SELECTOR_CLASS=1;
    const SELECTOR_TAG=2;
    const SELECTOR_ID=3;


    public $Value;
    public $SelectorType;
    public $SearchInParent;
    public function __construct($selector,$searchInParents)
    {
        $this->SearchInParent=$searchInParents;
        if($selector[0]=='.')
        {
            $this->SelectorType = StyleSelector::SELECTOR_CLASS;
            $this->Value=\substr($selector,1);
        }else if($selector[0]=='#')
        {
            $this->SelectorType = StyleSelector::SELECTOR_ID;
            $this->Value=\substr($selector,1);
        }else
        {
            $this->SelectorType = StyleSelector::SELECTOR_TAG;
            $this->Value=$selector;
        }

    }

    /**
     * @param $node DOMElement
     */
    public function Match($node){
        if($this->SearchInParent)
            return $this->InternalMatch($node->parentNode,true);
        else
            return $this->InternalMatch($node,false);

    }

    /**
     * @param $node DOMElement
     */
    public function InternalMatch($node,$searchInParents)
    {
        if($node==null)
            return false;
        $found=false;
        switch ($this->SelectorType)
        {
            case StyleSelector::SELECTOR_ID:
                $found= $node->getAttribute('id')==$this->Value;
                break;
            case StyleSelector::SELECTOR_CLASS:
            {
                $classes=explode(' ', $node->getAttribute('class'));
                $found= \array_search($this->Value,$classes)!==false;
                break;
            }
            case StyleSelector::SELECTOR_TAG:
                $found= $node->tagName==$this->Value;
                break;
        }

        if(!$found&&$searchInParents)
            return $this->InternalMatch($node->parentNode,$searchInParents);

        return $found;
    }


}