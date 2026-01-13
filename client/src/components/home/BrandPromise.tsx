import Section from "../../components/common/Section";
import Image from "next/image";
import Head from "next/head";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.wildnroot.com";

export default function BrandPromise() {
  return (
    <Section>
      {/* Canonical for SEO */}
      <Head>
        <link rel="canonical" href={SITE} />
      </Head>

      <div className="wnr-container">
        <div className="mx-auto py-6 text-center max-w-3xl">
          {/* Headline */}
          <h2 className="font-display text-[22px] leading-[30px] md:text-3xl md:leading-[42px] font-semibold text-[var(--wnr-berry)]">
            A cup of BREW, a ritual of wellness &nbsp;
            <br className="hidden sm:block" />
            rooted in nature’s <span className="uppercase">TIMELESS WISDOM</span>!
          </h2>

          {/* Read more pill */}
          <div className="mt-4">
  
</div>

          {/* Emblem */}
          <div className="mx-auto mt-14 w-32 md:w-40 lg:w-48">
            <Image
              src="https://res.cloudinary.com/dob666wa0/image/upload/v1761773345/Good_habbit_ub2ix0.png"
              alt="a good habit emblem"
              width={200}
              height={200}
              className="w-full h-auto"
            />
          </div>

          {/* Paragraph */}
          <p className="mt-6 leading-6 text-[var(--wnr-berry)] max-w-xl mx-auto" style={{ fontSize: '24px' }}>
            At Wild n' Root, we blend age-old botanical wisdom with modern wellness needs to create
            a daily ritual that supports your body and mind. Each cup is crafted to nourish,
            energize, and balance—helping you stay grounded, vibrant, and aligned with your
            natural rhythm. Whether you're winding down or powering up, Wild n' Root invites you
            to sip with intention.
          </p>

          {/* Three circular feature icons */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-2 place-items-center">
            {/* Reusable circle item */}
            {[
              { 
                title: ['HYDRATE','YOURSELF'], 
                src: 'https://res.cloudinary.com/dob666wa0/image/upload/v1761773276/hydration_copy_lauyp1.png', 
                alt: 'Hydrate Yourself',
                imgClass: "bottom-[-48%] w-44 h-44"
              },
              { 
                title: ['SLEEP','ENOUGH'],     
                src: 'https://res.cloudinary.com/dob666wa0/image/upload/v1761773278/sleep_copy_mp0xir.png', 
                alt: 'Sleep Enough',
                imgClass: "bottom-[-65%] w-48 h-48"
              },
              { 
                title: ['EAT','CLEAN'],        
                src: 'https://res.cloudinary.com/dob666wa0/image/upload/v1761773277/eat_copy_r3sru5.png',   
                alt: 'Eat Clean',
                imgClass: "bottom-[-15%] w-30 h-30"
              },
            ].map((item) => (
              <div key={item.alt} className="flex flex-col items-center">
                <div className="relative w-40 h-40 rounded-full bg-[#e6d3b9] shadow-soft ring-1 ring-black/5 overflow-hidden
                                flex flex-col items-center">
                  {/* Top label */}
                  <span className="mt-5 text-[16px] font-semibold tracking-wide text-[var(--wnr-berry)] leading-4 text-center">
                    {item.title[0]}<br/>{item.title[1]}
                  </span>

                  {/* Zoomed image, only top half visible */}
                  <div className={`absolute left-1/2 -translate-x-1/2 ${item.imgClass}`}>
                    <Image
                      src={item.src}
                      alt={item.alt}
                      fill
                      className="object-contain"
                      sizes="208px"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* End features */}
        </div>
      </div>
    </Section>
  );
}
