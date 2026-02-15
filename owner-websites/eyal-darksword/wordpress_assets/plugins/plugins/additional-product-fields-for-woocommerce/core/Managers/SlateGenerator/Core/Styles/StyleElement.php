<?php


namespace rednaowooextraproduct\core\Managers\SlateGenerator\Core\Styles;


class StyleElement
{
    /** @var StyleSelector[] */
    public $SelectorElements;
    public $Values;
    public function __construct($selector,$value)
    {
        $this->Values=$value;
        $selector=trim($selector);
        $style=array_map(function ($x){return trim($x);}, \explode(' ',$selector));
        $styleElements=\array_filter($style,function ($x){return $x!='';});
        $styleElements=\array_values($styleElements);

        $this->SelectorElements=[];
        for($i=0;$i<count($styleElements);$i++)
        {
            $this->SelectorElements[]=new StyleSelector($styleElements[$i],$i<\count($styleElements)-1);
        }



    }

    public function Match($node)
    {
        foreach($this->SelectorElements as $selector)
        {
            if(!$selector->Match($node))
                return false;
        }

        return true;
    }

    public function AddStyles($node)
    {
        $styles=$node->getAttribute('style');
        foreach($this->Values as $attribute=>$value)
        {
            if(strpos($styles,";".$attribute.":")!==false||strpos($styles,$attribute.":")===0)
                continue;

            $styles.=$attribute.':'.$value.';';
        }

        $node->setAttribute('style',$styles);
    }

}
