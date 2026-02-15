(function ($) {
    $('body')
        .on(
            'click',
            '.js--filter-item',
            function () {
                let category = $(this).attr('data-category');
                $('.js--filter-item').removeClass('active');
                $(this).addClass('active');


                if (category === 'all') {
                    $('.js--plugin-item').show();
                } else {
                    $('.js--plugin-item').hide();

                    $('.js--plugin-item[data-category=' + category + ']').show();
                }

                return false;
            }
        );

})(jQuery);
